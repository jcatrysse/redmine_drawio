# frozen_string_literal: true

require File.expand_path('../test_helper', __dir__)
require File.expand_path('lib/redmine_drawio/drawio_macros_test', __dir__)

module RedmineDrawio
  # DrawioMacrosTest includes the route helpers. Minitest runs every public method
  # whose name starts with test_, so a named route such as core's test_email or
  # another plugin's test_ldap_setting turned into a "test" there, and failed with
  # ActionController::UrlGenerationError when the route needs parameters.
  class RunnableMethodsTest < ActiveSupport::TestCase
    test 'route helpers are not run as tests' do
      # Rails 8 draws routes lazily; whether they are drawn before minitest lists
      # the tests depends on load order, so draw them here
      Rails.application.reload_routes_unless_loaded
      helpers = Rails.application.routes.named_routes.helper_names.map(&:to_s)
      assert_includes helpers, 'test_email_path' # core's route, so the check is not empty
      run = DrawioMacrosTest.runnable_methods & helpers
      assert_empty run, "route helpers run as tests: #{run.join(', ')}"
    end

    test 'the real macro tests still run' do
      assert DrawioMacrosTest.runnable_methods.size.positive?
      assert(DrawioMacrosTest.runnable_methods.all? { |m| DrawioMacrosTest.instance_method(m).source_location.first.end_with?('drawio_macros_test.rb') })
    end
  end
end
