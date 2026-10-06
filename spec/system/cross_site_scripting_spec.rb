require "spec_helper"

RSpec.describe "cross site scripting", type: :system do
  fixtures :projects, :users, 
           :email_addresses, 
           :roles, :members, 
           :member_roles,            
           :trackers,
           :projects_trackers,
           :enabled_modules,
           :wikis,
           :wiki_pages,
           :wiki_contents

  before do
    Attachment.storage_path = "#{Rails.root}/plugins/redmine_drawio/spec/files"
    log_user('admin', 'admin')
  end

  describe "drawio_attach" do    
    it "does not execute javascript from uploaded SVG (XSS proof)" do
      Attachment.create!(
        container_id: 1,
        container_type: "WikiPage",
        filename: "xss.svg",
        disk_filename: "xss.svg",
        filesize: 1,
        content_type: "image/svg+xml",
        digest: "c1993a380fa0031d269ce96de5cb30eca04d3bfbc1bedbb5ea5834d0e17b66f4",
        downloads: 0,
        author_id: 1,
        description: "",
        disk_directory: ""
      )
      WikiContent.first.update!(text: "{{drawio_attach(xss.svg)}}")
      
      # expect no javascript alert is rendered
      expect do
        accept_alert wait: 2 do
          visit "/projects/ecookbook/wiki"
        end
      end.to raise_error(Capybara::ModalNotFound)
    end

    it "does not execute javascript from uploaded SVG rendered inline (XSS proof)" do
      Setting.plugin_redmine_drawio = { 'drawio_service_url' => '//embed.diagrams.net', 'drawio_svg_enabled' => true }
      Attachment.create!(
        container_id: 1,
        container_type: "WikiPage",
        filename: "xss.svg",
        disk_filename: "xss.svg",
        filesize: 1,
        content_type: "image/svg+xml",
        digest: "c1993a380fa0031d269ce96de5cb30eca04d3bfbc1bedbb5ea5834d0e17b66f4",
        downloads: 0,
        author_id: 1,
        description: "",
        disk_directory: ""
      )
      WikiContent.first.update!(text: "{{drawio_attach(xss.svg)}}")

      # the diagram is there, inline, without its script
      expect do
        accept_alert wait: 2 do
          visit "/projects/ecookbook/wiki"
        end
      end.to raise_error(Capybara::ModalNotFound)
      expect(page).to have_css('span.drawioDiagram svg circle')
      expect(page).to have_no_css('span.drawioDiagram svg script', visible: :all)
    ensure
      Setting.plugin_redmine_drawio = { 'drawio_service_url' => '//embed.diagrams.net', 'drawio_svg_enabled' => false }
    end
  end
end
