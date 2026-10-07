# frozen_string_literal: true

require 'test_helper'

module RedmineDrawio
  class AdaptSvgTest < ActiveSupport::TestCase

    # Single <script> tag
    def test_removes_single_script_tag
      svg = '<svg><script>alert(1)</script><circle/></svg>'
      result = Macros.adaptSvg(svg, nil)
      assert_not_includes result, 'alert(1)'
    end

    # Multiple <script> tags
    def test_removes_all_script_tags
      svg = '<svg><script>alert(1)</script><script>alert(2)</script></svg>'
      result = Macros.adaptSvg(svg, nil)
      assert_not_includes result, 'alert(1)'
      assert_not_includes result, 'alert(2)'
    end

    # Multiline script block
    def test_removes_multiline_script_tag
      svg = "<svg><script>\nalert(1)\n</script></svg>"
      result = Macros.adaptSvg(svg, nil)
      assert_not_includes result, 'alert(1)'
    end

    # Case-mixed tag name
    def test_removes_mixed_case_script_tag
      svg = '<svg><sCriPt>alert(1)</sCriPt><circle/></svg>'
      result = Macros.adaptSvg(svg, nil)
      assert_not_includes result, 'alert(1)'
    end

    # Event handler on root element
    def test_removes_onload_handler
      svg = '<svg onload="alert(1)"><circle/></svg>'
      result = Macros.adaptSvg(svg, nil)
      assert_no_match(/onload/i, result)
      assert_not_includes result, 'alert(1)'
    end

    # Event handler on a child element
    def test_removes_onclick_handler
      svg = '<svg><rect onclick="alert(1)" width="10" height="10"/></svg>'
      result = Macros.adaptSvg(svg, nil)
      assert_no_match(/onclick/i, result)
      assert_not_includes result, 'alert(1)'
    end

    # javascript: URL in href
    def test_neutralizes_javascript_href
      svg = '<svg><a href="javascript:alert(1)">click</a></svg>'
      result = Macros.adaptSvg(svg, nil)
      assert_no_match(/javascript:/i, result)
    end

    # javascript: URL in xlink:href (SVG-specific)
    def test_neutralizes_javascript_xlink_href
      svg = '<svg><a xlink:href="javascript:alert(1)">click</a></svg>'
      result = Macros.adaptSvg(svg, nil)
      assert_no_match(/javascript:/i, result)
    end

    # Safe content must be preserved
    def test_preserves_safe_svg_content
      svg = '<svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="red"/></svg>'
      result = Macros.adaptSvg(svg, nil)
      assert_includes result, '<circle'
      assert_includes result, 'fill="red"'
    end

    # diagrams.net exports start with an XML declaration and a DOCTYPE; parsed as a
    # fragment they became visible text ("!DOCTYPE svg PUBLIC ...") above the diagram
    def test_drops_xml_declaration_and_doctype
      svg = %(<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE svg PUBLIC "-//W3C//DTD SVG 1.1//EN" ) +
            %("http://www.w3.org/Graphics/SVG/1.1/DTD/svg11.dtd">\n<svg width="10px" height="10px"><circle/></svg>)
      result = Macros.adaptSvg(svg, nil)
      assert_no_match(/DOCTYPE|<\?xml/, result)
      assert_match(/\A<svg /, result)
      assert_includes result, '<circle'
    end

    # Allowlist (decision q3, 2026-10-07): only known SVG parts pass

    # <animate>/<set> can write a javascript: URL into href after the filter ran
    def test_removes_animation_elements_that_can_set_attributes
      svg = '<svg><a><animate attributeName="href" values="#;javascript:alert(1)"/>' \
            '<set attributeName="href" to="javascript:alert(2)"/><text>x</text></a></svg>'
      result = Macros.adaptSvg(svg, nil)
      assert_no_match(/animate|<set|alert/, result)
      assert_includes result, '<text>x</text>'
    end

    # an iframe in a foreignObject runs its own document
    def test_removes_elements_that_load_documents
      svg = '<svg><foreignObject><div>label</div><iframe src="data:text/html,x"></iframe>' \
            '<object data="x.swf"></object><embed src="x"/></foreignObject></svg>'
      result = Macros.adaptSvg(svg, nil)
      assert_no_match(/iframe|object|embed|data:text/, result)
      assert_includes result, '<div>label</div>'
    end

    # browsers ignore tabs and newlines inside a URL scheme
    def test_neutralizes_obfuscated_javascript_href
      svg = %(<svg><a href="java&#x09;script:alert(1)">a</a><a xlink:href=" JAVA\nSCRIPT:alert(2)">b</a></svg>)
      result = Macros.adaptSvg(svg, nil)
      assert_no_match(/script:/i, result)
    end

    def test_removes_data_urls_other_than_images
      svg = '<svg><a href="data:text/html;base64,PHNjcmlwdD4=">a</a>' \
            '<image href="data:image/png;base64,iVBORw0KGgo="/></svg>'
      result = Macros.adaptSvg(svg, nil)
      assert_not_includes result, 'data:text/html'
      assert_includes result, 'data:image/png;base64,iVBORw0KGgo='
    end

    def test_removes_dangerous_css
      svg = '<svg><rect style="fill:red;background:url(javascript:alert(1))"/>' \
            '<style>rect{behavior:url(x.htc)}</style><circle style="fill:blue"/></svg>'
      result = Macros.adaptSvg(svg, nil)
      assert_no_match(/javascript|behavior/, result)
      assert_includes result, 'style="fill:blue"'
    end

    def test_keeps_links_and_drawio_source
      svg = '<svg content="&lt;mxfile&gt;&lt;/mxfile&gt;"><a href="https://example.com/x">x</a>' \
            '<a href="#cell-1">y</a></svg>'
      result = Macros.adaptSvg(svg, nil)
      assert_includes result, 'href="https://example.com/x"'
      assert_includes result, 'href="#cell-1"'
      assert_includes result, 'content="&lt;mxfile&gt;&lt;/mxfile&gt;"'
    end

    # a diagrams.net export keeps its shapes, gradients and html labels
    def test_default_svg_diagram_keeps_its_parts
      svg = File.read(Macros.imagePath('defaultImage.svg'), mode: 'rb')
      result = Macros.adaptSvg(svg, nil)
      %w[linearGradient stop rect path switch foreignObject div text content=].each do |part|
        assert_includes result, part
      end
      assert_includes result, 'Double click to'
    end

    def test_default_svg_diagram_starts_with_the_svg_element
      svg = File.read(Macros.imagePath('defaultImage.svg'), mode: 'rb')
      result = Macros.adaptSvg(svg, nil)
      assert_match(/\A<svg /, result)
      assert_not_includes result, 'DOCTYPE'
    end

  end
end
