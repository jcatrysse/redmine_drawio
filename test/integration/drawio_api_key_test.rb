# frozen_string_literal: true

require File.expand_path('test_helper', File.dirname(__dir__))
require File.expand_path('authenticate_user', File.dirname(__dir__))

module RedmineDrawio
  # POST /drawio/api_key hands the API key to the editor when a diagram is saved.
  class DrawioApiKeyTest < ActionDispatch::IntegrationTest
    include RedmineDrawio::AuthenticateUser

    fixtures :users, :email_addresses, :roles, :projects, :members, :member_roles, :enabled_modules

    def setup
      Setting.rest_api_enabled = '1'
    end

    def teardown
      Setting.rest_api_enabled = nil
    end

    test 'returns the api key of the current user, not cached' do
      log_user('jsmith', 'jsmith')
      post '/drawio/api_key', headers: { 'Accept' => 'application/json' }
      assert_response :success
      assert_equal User.find_by_login('jsmith').api_key, response.parsed_body['key']
      assert_equal 'no-store', response.headers['Cache-Control']
    end

    test 'is refused when the rest api is disabled' do
      Setting.rest_api_enabled = '0'
      log_user('jsmith', 'jsmith')
      post '/drawio/api_key', headers: { 'Accept' => 'application/json' }
      assert_response :forbidden
      assert_not_includes response.body, User.find_by_login('jsmith').api_key
    end

    test 'is refused to anonymous users' do
      # core require_login answers a JSON request without API auth with 403
      post '/drawio/api_key', headers: { 'Accept' => 'application/json' }, xhr: true
      assert_response :forbidden
      assert response.body.blank?
    end

    test 'is refused to a user who cannot edit wiki pages or issues anywhere' do
      Role.find(1).remove_permission!(*DrawioController::EDIT_PERMISSIONS)
      Role.find(2).remove_permission!(*DrawioController::EDIT_PERMISSIONS)
      Role.non_member.remove_permission!(*DrawioController::EDIT_PERMISSIONS)
      log_user('jsmith', 'jsmith')
      post '/drawio/api_key', headers: { 'Accept' => 'application/json' }
      assert_response :forbidden
      assert_not_includes response.body, User.find_by_login('jsmith').api_key
    end

    test 'is not routed for GET' do
      log_user('jsmith', 'jsmith')
      get '/drawio/api_key'
      assert_response :not_found
    end

    test 'requires the CSRF token' do
      log_user('jsmith', 'jsmith')
      ActionController::Base.allow_forgery_protection = true
      post '/drawio/api_key', headers: { 'Accept' => 'application/json' }
      assert_response 422
      assert_not_includes response.body, User.find_by_login('jsmith').api_key
    ensure
      ActionController::Base.allow_forgery_protection = false
    end
  end
end
