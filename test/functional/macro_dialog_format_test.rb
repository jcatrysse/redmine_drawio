# frozen_string_literal: true

require File.expand_path('test_helper', File.dirname(__dir__))

module RedmineDrawio
  # The macro dialog is rendered at the bottom of every layout. A page rendered as
  # HTML while the request asks another format (seen on repository diffs) must not
  # fail with a missing template, which Redmine answers with a 404.
  class MacroDialogFormatTest < ActionController::TestCase
    tests WelcomeController

    fixtures :users

    def setup
      @controller.request = @request
      @controller.set_response!(@response)
    end

    test 'macro dialog renders for a request in another format' do
      @request.format = :text
      @controller.formats = [:text]
      html = RedmineDrawio::Hooks::MacroDialog.instance.view_layouts_base_body_bottom(controller: @controller)
      assert_includes html, 'dlg_redmine_drawio'
    end

    test 'macro dialog renders for an html request' do
      @request.format = :html
      @controller.formats = [:html]
      html = RedmineDrawio::Hooks::MacroDialog.instance.view_layouts_base_body_bottom(controller: @controller)
      assert_includes html, 'dlg_redmine_drawio'
    end
  end
end
