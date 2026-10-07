# frozen_string_literal: true

# Copyright (C) 2022 Liane Hampe <liaham@xmera.de>, xmera.

require 'base64'
require File.expand_path('test_helper', File.dirname(__dir__))
require File.expand_path('authenticate_user', File.dirname(__dir__))
require File.expand_path('load_fixtures', File.dirname(__dir__))
require File.expand_path('with_drawio_settings', File.dirname(__dir__))

module RedmineDrawio
  class ViewHooksTest < ActionDispatch::IntegrationTest
    include Redmine::I18n
    include RedmineDrawio::AuthenticateUser
    include RedmineDrawio::LoadFixtures
    include RedmineDrawio::WithDrawioSettings

    fixtures :users, :email_addresses, :roles, :projects, :members, :member_roles,
             :enabled_modules, :wikis, :wiki_pages, :wiki_contents

    def setup
      @view_hooks = RedmineDrawio::Hooks::ViewHooks.instance
    end

    def teardown
      Setting.rest_api_enabled = nil
    end

    test 'render warning_api_needs_to_be_enabled when api is disabled' do
      render_view_hooks(user: 'admin', password: 'admin')
      assert_select '#flash_warning', text: /REST API/
    end

    # Redmine 7 moved the REST API switch to Administration > Settings > Integrations;
    # the warning builds that path from core's own labels, in the user's language
    test 'warning names the Redmine 7 settings tab' do
      render_view_hooks(user: 'admin', password: 'admin')
      assert_select '#flash_warning', text: /Administration -> Settings -> Integrations/
      assert_select '#flash_warning', text: /-> API/, count: 0
    end

    test 'warning names the settings tab in the language of the user' do
      User.find_by_login('admin').update!(language: 'de')
      render_view_hooks(user: 'admin', password: 'admin')
      path = "#{::I18n.t(:label_administration, locale: :de)} -> #{::I18n.t(:label_settings, locale: :de)} -> " \
             "#{::I18n.t(:label_integrations, locale: :de)}"
      assert_select '#flash_warning', text: /#{Regexp.escape(path)}/
      assert_select '#flash_warning', text: /muss die REST API/
    end

    test 'do not render warning_api_needs_to_be_enabled when api is enabled' do
      render_view_hooks(user: 'admin', password: 'admin', rest_api_enabled: '1')
      assert_select '#flash_warning', 0
    end

    test 'do not render warning_api_needs_to_be_enabled for non admin user' do
      render_view_hooks(user: 'jsmith', password: 'jsmith', rest_api_enabled: '1')
      assert_select '#flash_warning', 0
    end

    # The API key used to be embedded (base64, reversed) in every editable page;
    # the editor now fetches it from /drawio/api_key when a diagram is saved.
    test 'do not render the api key when api is disabled' do
      render_wiki_page(rest_api_enabled: '0')
      assert_select 'script', text: /var Drawio/
      assert_not_includes response.body, 'hashCode'
      assert_not_includes response.body, User.find_by_login('jsmith').api_key
    end

    test 'do not render the api key when api is enabled' do
      render_wiki_page(rest_api_enabled: '1')
      key = User.find_by_login('jsmith').api_key
      assert_select 'script', text: /var Drawio/
      assert_not_includes response.body, 'hashCode'
      assert_not_includes response.body, key
      assert_not_includes response.body, Base64.strict_encode64(key).reverse
    end

    test 'render user preference for drawio ui' do
      render_view_hooks(user: 'jsmith', password: 'jsmith', rest_api_enabled: '1')
      get '/my/account'
      assert_response :success

      assert_select 'label[for=pref_drawio_ui]'
    end

    private

    def render_wiki_page(rest_api_enabled:)
      Setting.rest_api_enabled = rest_api_enabled
      log_user('jsmith', 'jsmith')
      get '/projects/ecookbook/wiki'
      assert_response :success
    end

    def render_view_hooks(user:, password:, rest_api_enabled: '0')
      Setting.rest_api_enabled = rest_api_enabled
      log_user(user, password)
      get '/'
      assert_response :success
    end
  end
end
