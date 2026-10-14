# frozen_string_literal: true

# Hands the diagram editor a short lived token (RedmineDrawio::ApiToken) when a
# diagram is saved. The REST API key never leaves the server; the token is
# accepted by the REST API for 15 minutes in its place. Session and CSRF token
# authenticate this request; the response is never cached.
class DrawioController < ApplicationController
  EDIT_PERMISSIONS = %i[edit_wiki_pages edit_issues edit_own_issues add_issue_notes
                        edit_issue_notes edit_own_issue_notes].freeze

  before_action :require_login
  before_action :authorize_drawio_save

  def token
    response.headers['Cache-Control'] = 'no-store'
    token = RedmineDrawio::ApiToken.issue(User.current)
    # no token while two-factor activation is pending: refuse here, not at the first REST call
    return head(:forbidden) if token.blank?

    render json: { token: token }
  end

  private

  def authorize_drawio_save
    return head(:forbidden) unless Setting.rest_api_enabled?

    deny_access unless EDIT_PERMISSIONS.any? { |p| User.current.allowed_to?(p, nil, global: true) }
  end
end
