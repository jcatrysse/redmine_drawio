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

    def test_default_svg_diagram_starts_with_the_svg_element
      svg = File.read(Macros.imagePath('defaultImage.svg'), mode: 'rb')
      result = Macros.adaptSvg(svg, nil)
      assert_match(/\A<svg /, result)
      assert_not_includes result, 'DOCTYPE'
    end

  end
end
