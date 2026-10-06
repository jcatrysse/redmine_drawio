# frozen_string_literal: true

# Hands the current user's API key to the diagram editor when a diagram is
# saved, instead of embedding it in every wiki and issue page. Session and
# CSRF token authenticate the request; the key is never cached.
class DrawioController < ApplicationController
  EDIT_PERMISSIONS = %i[edit_wiki_pages edit_issues edit_own_issues add_issue_notes
                        edit_issue_notes edit_own_issue_notes].freeze

  before_action :require_login
  before_action :authorize_drawio_save

  def api_key
    response.headers['Cache-Control'] = 'no-store'
    render json: { key: User.current.api_key }
  end

  private

  def authorize_drawio_save
    return head(:forbidden) unless Setting.rest_api_enabled?

    deny_access unless EDIT_PERMISSIONS.any? { |p| User.current.allowed_to?(p, nil, global: true) }
  end
end
