# Data for the redmine_drawio end-to-end scenarios (test/e2e/*.mjs), run by
# start_server.sh after the generic seed. It resets the pages and issues below
# on every run (text and attachments), because the save scenarios change them.
#
# Wiki pages of e2e-project:
#   Drawio_png      {{drawio_attach(flow)}}            png, no attachment yet: default image
#   Drawio_svg      {{drawio_attach(flow.svg)}}        svg (needs the svg setting)
#   Drawio_xml      {{drawio_attach(flow.xml)}} and {{drawio_attach(other.drawio, zoom=true)}}
#   Drawio_options  size=120, the deprecated drawio macro, a non-diagram extension
#   Drawio_attached {{drawio_attach(stored.png)}}      with an existing attachment stored.png
# Issue "E2E drawio issue": diagram in the description and in a note.
# e2e-private wiki page Drawio_private: a diagram outsider must never see.
admin = User.find_by!(login: 'admin')
User.current = admin
project = Project.find_by!(identifier: 'e2e-project')
private_project = Project.find_by!(identifier: 'e2e-private')
plugin_spec = File.expand_path('../../spec', __dir__)

Setting.plugin_redmine_drawio = { 'drawio_service_url' => '//embed.diagrams.net', 'drawio_svg_enabled' => false }
Setting.rest_api_enabled = '1'

def drawio_page(project, title, text, author)
  wiki = project.wiki
  page = wiki.find_page(title) || WikiPage.new(wiki: wiki, title: title)
  page.attachments.each(&:destroy) unless page.new_record?
  if page.new_record?
    page.save_with_content(WikiContent.new(text: text, author: author))
  elsif page.content.text != text
    page.content.text = text
    page.content.author = author
    page.content.comments = 'e2e reset'
    page.content.save!
  end
  page.reload
end

def attach(container, path, filename, author)
  attachment = Attachment.new(file: File.open(path, 'rb'), author: author)
  attachment.filename = filename
  attachment.content_type = Redmine::MimeType.of(filename)
  attachment.container = container
  attachment.save!
  attachment
end

drawio_page(project, 'Drawio_png', "Diagram as png:\n\n{{drawio_attach(flow)}}", admin)
drawio_page(project, 'Drawio_svg', "Diagram as svg:\n\n{{drawio_attach(flow.svg)}}", admin)
drawio_page(project, 'Drawio_xml', "Diagram as xml:\n\n{{drawio_attach(flow.xml)}}\n\n" \
                                   "Diagram as drawio with zoom:\n\n{{drawio_attach(other.drawio, zoom=true)}}", admin)
drawio_page(project, 'Drawio_options', "Fixed width 120:\n\n{{drawio_attach(small, size=120)}}\n\n" \
                                       "Deprecated macro:\n\n{{drawio(old)}}\n\n" \
                                       "Not a diagram:\n\n{{drawio_attach(notes.txt)}}", admin)
stored = drawio_page(project, 'Drawio_attached', "Stored diagram:\n\n{{drawio_attach(stored.png)}}", admin)
attach(stored, File.join(plugin_spec, 'icona.png'), 'stored.png', admin)
drawio_page(private_project, 'Drawio_private', "Private diagram:\n\n{{drawio_attach(secret)}}", admin)

issue = Issue.find_by(project_id: project.id, subject: 'E2E drawio issue') ||
        Issue.new(project: project, tracker: project.trackers.first, subject: 'E2E drawio issue', author: admin,
                  priority: IssuePriority.default || IssuePriority.first)
issue.attachments.each(&:destroy) unless issue.new_record?
issue.journals.destroy_all unless issue.new_record?
issue.description = "Diagram in the description:\n\n{{drawio_attach(issue_flow)}}"
issue.status ||= issue.tracker.default_status
issue.save!
issue.reload
issue.init_journal(admin, "Diagram in a note:\n\n{{drawio_attach(note_flow)}}")
issue.save!

puts "Drawio seed: wiki pages #{project.wiki.pages.where("title LIKE 'Drawio%'").count}, issue ##{issue.id}"
