export interface MarkdownSection {
  id: string;
  title: string;
  level: number; // 1 = h1, 2 = h2
  content: string;
}

/**
 * Parse markdown into sections based on h1 and h2 headers only.
 * h3 and below are kept as part of the section content.
 * Returns an array of sections with their title, level, and content.
 */
export function parseMarkdownSections(markdown: string): MarkdownSection[] {
  const sections: MarkdownSection[] = [];
  const lines = markdown.split('\n');
  let currentSection: MarkdownSection | null = null;
  let contentBuffer: string[] = [];

  for (const line of lines) {
    // Only match # and ## headers - h3 and below stay in content
    const h1Match = line.match(/^# (.+)$/);
    const h2Match = !h1Match && line.match(/^## (.+)$/);

    if (h1Match || h2Match) {
      // Save previous section
      if (currentSection) {
        currentSection.content = contentBuffer.join('\n').trim();
        sections.push(currentSection);
      }

      const title = h1Match ? h1Match[1] : (h2Match as RegExpMatchArray)[1];
      const level = h1Match ? 1 : 2;

      currentSection = {
        id: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
        title,
        level,
        content: ''
      };
      contentBuffer = [];
    } else {
      contentBuffer.push(line);
    }
  }

  // Don't forget last section
  if (currentSection) {
    currentSection.content = contentBuffer.join('\n').trim();
    sections.push(currentSection);
  }

  return sections;
}

/**
 * Get the title section (h1) from parsed sections
 */
export function getTitleSection(sections: MarkdownSection[]): MarkdownSection | undefined {
  return sections.find(s => s.level === 1);
}

/**
 * Get body sections (h2) from parsed sections
 */
export function getBodySections(sections: MarkdownSection[]): MarkdownSection[] {
  return sections.filter(s => s.level === 2);
}

/**
 * Check if a section should be collapsible based on its ID
 */
export function isCollapsibleSection(sectionId: string): boolean {
  // All main content sections are collapsible
  const collapsibleIds = [
    'overview',
    'core-concepts',
    'stories-examples',
    'exercises-practices',
    'key-insights',
    'key-takeaways',
  ];
  return collapsibleIds.includes(sectionId);
}
