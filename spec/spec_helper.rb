# frozen_string_literal: true

# Loads Redmine's test environment for the plugin's specs. rspec-rails is not a
# dependency of the plugin: .codex/test_setup.sh adds it to the bundle through
# Gemfile.local (capybara and selenium-webdriver come with Redmine's test group).
# Run from the Redmine root:
#   bundle exec rspec -I plugins/redmine_drawio/spec plugins/redmine_drawio/spec
# System specs use headless Chrome; RMP_CHROME_BIN points to another Chrome binary.
ENV['RAILS_ENV'] ||= 'test'
require File.expand_path('../../../config/environment', __dir__)
require 'rspec/rails'
require 'capybara/rspec'

module RedmineDrawio
  module SystemSpecHelper
    def log_user(login, password)
      visit '/login'
      fill_in 'username', with: login
      fill_in 'password', with: password
      find('#login-submit').click
      expect(page).to have_no_css('#login-form')
    end
  end
end

RSpec.configure do |config|
  fixtures = Rails.root.join('test/fixtures').to_s
  if config.respond_to?(:fixture_paths=)
    config.fixture_paths = [fixtures]
  else
    config.fixture_path = fixtures
  end
  config.use_transactional_fixtures = true
  config.include RedmineDrawio::SystemSpecHelper, type: :system

  config.before(:each, type: :system) do
    driven_by :selenium, using: :headless_chrome, screen_size: [1024, 900] do |options|
      options.binary = ENV['RMP_CHROME_BIN'] if ENV['RMP_CHROME_BIN'].present?
      options.add_argument('--no-sandbox')
    end
  end
end
