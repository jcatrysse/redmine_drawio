# frozen_string_literal: true

require File.expand_path('../test_helper', __dir__)

module RedmineDrawio
  # The REST API warning for admins is rendered by a layout hook. It used to be
  # written into flash[:warning] while the layout rendered, which replaced any
  # warning the controller had set for the same request.
  class ApiWarningFlashTest < ActionController::TestCase
    tests WelcomeController

    fixtures :users, :email_addresses, :roles, :projects, :members, :member_roles, :enabled_modules

    def setup
      Setting.rest_api_enabled = '0'
    end

    def teardown
      Setting.rest_api_enabled = nil
    end

    test 'a warning set by the controller is still shown next to the drawio warning' do
      @request.session[:user_id] = 1 # admin
      get :index, flash: { warning: 'Warning from another plugin' }
      assert_response :success
      assert_select 'div.flash.warning', text: /Warning from another plugin/
      assert_select 'div.flash.warning', text: /enable the REST API/
    end

    test 'the drawio warning does not linger in the flash for the next request' do
      @request.session[:user_id] = 1
      get :index
      assert_select 'div.flash.warning', text: /enable the REST API/
      assert_select '#flash_drawio_api_warning svg', 1 # the same warning icon as core's flash
      assert_nil flash[:warning]
    end

    test 'no drawio warning for non-admins' do
      @request.session[:user_id] = 2
      get :index, flash: { warning: 'Warning from another plugin' }
      assert_select 'div.flash.warning', text: /Warning from another plugin/
      assert_select 'div.flash.warning', text: /enable the REST API/, count: 0
    end
  end
end
