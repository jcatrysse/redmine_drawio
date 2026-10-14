# frozen_string_literal: true

require File.expand_path('test_helper', File.dirname(__dir__))
require File.expand_path('authenticate_user', File.dirname(__dir__))

module RedmineDrawio
  # POST /drawio/token hands the editor a short lived token (RedmineDrawio::ApiToken)
  # when a diagram is saved; the REST API accepts it in place of the API key, which
  # never reaches the browser. Adapted from upstream test/integration/api_token_test.rb
  # (0920e00), where the token is embedded in the page instead.
  class DrawioTokenTest < ActionDispatch::IntegrationTest
    include RedmineDrawio::AuthenticateUser

    fixtures :users, :email_addresses, :roles, :projects, :members, :member_roles, :enabled_modules,
             :trackers, :projects_trackers, :issue_statuses, :issues, :enumerations, :workflows

    # Description of issue 1 in the Redmine fixtures
    ORIGINAL_DESCRIPTION = 'Unable to print recipes'

    def setup
      Setting.rest_api_enabled = '1'
    end

    def teardown
      Setting.rest_api_enabled = nil
      User.current = nil
    end

    test 'returns a token, never the api key, not cached' do
      token = fetch_token('jsmith')
      assert_predicate token, :present?
      assert_not_includes response.body, User.find_by_login('jsmith').api_key
      assert_nil response.parsed_body['key']
      assert_equal 'no-store', response.headers['Cache-Control']
    end

    test 'the api key is in no page the browser gets while editing and saving' do
      key = User.find_by_login('jsmith').api_key
      log_user('jsmith', 'jsmith')
      get '/projects/ecookbook/wiki'
      # drawio's own part of the page; other plugins are not this plugin's to check
      # (redmine-view-customize puts the key in ViewCustomize.context, see the plan)
      drawio = css_select('script').map(&:text).select { |js| js.include?('var Drawio') }
      assert_not_empty drawio
      drawio.each { |js| assert_not_includes js, key }
      assert_not_includes response.body, 'hashCode'
      post '/drawio/token', headers: { 'Accept' => 'application/json' }
      assert_not_includes response.body, key
      token = response.parsed_body['token']
      upload(token)
      assert_not_includes response.body, key
    end

    test 'the token authenticates the upload of the editor' do
      upload(fetch_token('jsmith'))
      assert_response :created
      assert_kind_of Hash, response.parsed_body['upload']
    end

    # Compared with the API key on the same request, so the outcome does not depend
    # on what other installed plugins allow on issues
    test 'the token is accepted wherever the api key is, with the same rights' do
      %w[jsmith dlopper].each do |login|
        token = fetch_token(login)
        reset!
        Issue.find(1).update_column(:description, ORIGINAL_DESCRIPTION)
        put '/issues/1.json', params: { issue: { description: "by #{login}" } },
                              headers: { 'X-Redmine-API-Key' => User.find_by_login(login).api_key }
        with_key = [response.status, Issue.find(1).reload.description]
        Issue.find(1).update_column(:description, ORIGINAL_DESCRIPTION)
        update_issue(1, "by #{login}", token)
        assert_equal with_key, [response.status, Issue.find(1).reload.description], login
      end
    end

    test 'a request without or with an invalid token is not authenticated' do
      [nil, 'a token nobody can have signed'].each do |token|
        assert_no_difference 'Issue.count' do
          create_issue(token)
          assert_response :unauthorized
        end
        update_issue(1, 'Diagram', token)
        assert_equal ORIGINAL_DESCRIPTION, Issue.find(1).reload.description
      end
    end

    # /users/current.json needs a logged user, so it tells who the token authenticates
    test 'the token authenticates its own user' do
      token = fetch_token('jsmith')
      reset!
      get '/users/current.json', headers: token_headers(token)
      assert_response :success
      assert_equal 'jsmith', response.parsed_body['user']['login']
    end

    test 'an expired token is not accepted' do
      token = fetch_token('jsmith')
      reset!
      travel(RedmineDrawio::ApiToken::TTL + 1.minute) do
        get '/users/current.json', headers: token_headers(token)
        assert_response :unauthorized
      end
    end

    test 'a token is not accepted when the rest api is disabled' do
      token = fetch_token('jsmith')
      reset!
      Setting.rest_api_enabled = '0'
      get '/users/current.json', headers: token_headers(token)
      assert_response :forbidden
    end

    test 'a token does not log in an html request' do
      token = fetch_token('jsmith')
      reset!
      get '/my/account', headers: token_headers(token)
      assert_response :redirect
    end

    test 'no token when the rest api is disabled' do
      Setting.rest_api_enabled = '0'
      log_user('jsmith', 'jsmith')
      post '/drawio/token', headers: { 'Accept' => 'application/json' }
      assert_response :forbidden
      assert response.body.blank?
    end

    test 'no token for anonymous users' do
      # core require_login answers a JSON request without API auth with 403
      post '/drawio/token', headers: { 'Accept' => 'application/json' }, xhr: true
      assert_response :forbidden
      assert response.body.blank?
    end

    test 'no token for a user who cannot edit wiki pages or issues anywhere' do
      [Role.find(1), Role.find(2), Role.non_member].each do |role|
        role.remove_permission!(*DrawioController::EDIT_PERMISSIONS)
      end
      log_user('jsmith', 'jsmith')
      post '/drawio/token', headers: { 'Accept' => 'application/json' }
      assert_response :forbidden
      assert response.body.blank?
    end

    test 'no token while two-factor activation is pending' do
      log_user('jsmith', 'jsmith')
      User.any_instance.stubs(:must_activate_twofa?).returns(true)
      post '/drawio/token', headers: { 'Accept' => 'application/json' }
      assert_includes [302, 401, 403], response.status
      assert_not_includes response.body, '"token"'
    end

    test 'not routed for GET' do
      log_user('jsmith', 'jsmith')
      get '/drawio/token'
      assert_response :not_found
    end

    test 'requires the CSRF token' do
      log_user('jsmith', 'jsmith')
      ActionController::Base.allow_forgery_protection = true
      post '/drawio/token', headers: { 'Accept' => 'application/json' }
      assert_response 422
      assert_not_includes response.body, '"token"'
    ensure
      ActionController::Base.allow_forgery_protection = false
    end

    test 'the header sent by the editor is the one accepted by the server' do
      editor = File.read(File.expand_path('../../assets/javascripts/drawioEditor.js', __dir__))
      assert_includes editor, RedmineDrawio::ApiToken::HEADER
      assert_not_includes editor, 'X-Redmine-API-Key'
    end

    private

    def fetch_token(login)
      log_user(login, login == 'dlopper' ? 'foo' : login)
      post '/drawio/token', headers: { 'Accept' => 'application/json' }
      assert_response :success
      response.parsed_body['token']
    end

    def upload(token)
      post '/uploads.json', headers: { 'RAW_POST_DATA' => 'Drawio data',
                                       'CONTENT_TYPE' => 'application/octet-stream' }.merge(token_headers(token))
    end

    def update_issue(id, description, token)
      put "/issues/#{id}.json", params: { issue: { description: description } }, headers: token_headers(token)
    end

    # Creating an issue is not allowed for the anonymous user, so this endpoint
    # tells an authenticated request from an unauthenticated one.
    def create_issue(token = nil)
      post '/issues.json', params: { issue: { project_id: 1, subject: 'Drawio diagram' } },
                           headers: token_headers(token)
    end

    def token_headers(token)
      return {} if token.nil?

      { RedmineDrawio::ApiToken::HEADER => token }
    end
  end
end
