import { getSettings, parse } from 'orga';
import { normalizeOrgContent } from './normalize.js';

function headlineTitle(headline) {
  const parts = [];
  for (const child of headline.children ?? []) {
    if (child.type === 'text' && child.value) {
      parts.push(child.value);
    }
  }
  return parts.join('').trim() || 'Untitled section';
}

function headlineLevel(headline) {
  const stars = headline.children?.find((child) => child.type === 'stars');
  if (stars?.level) return stars.level;
  if (stars?.value) return stars.value.length;
  return 1;
}

function headlineTodo(headline) {
  const todoNode = headline.children?.find((child) => child.type === 'todo');
  return todoNode?.keyword ?? null;
}

function headlineTags(headline) {
  const tagsNode = headline.children?.find((child) => child.type === 'tags');
  if (!tagsNode?.tags?.length) return [];
  return tagsNode.tags;
}

function walkSection(section, headings) {
  if (!section?.children) return;

  for (const child of section.children) {
    if (child.type === 'headline') {
      headings.push({
        level: headlineLevel(child),
        title: headlineTitle(child),
        todo: headlineTodo(child),
        tags: headlineTags(child),
        line: child.position?.start?.line ?? 1,
      });
    }
    if (child.type === 'section') {
      walkSection(child, headings);
    }
  }
}

export function parseOrgDocument(content) {
  if (!content?.trim()) {
    return {
      keywords: {},
      headings: [],
      title: null,
      author: null,
      todoKeywords: ['TODO', 'DONE'],
    };
  }

  const normalized = normalizeOrgContent(content);
  const settings = getSettings(normalized);
  const doc = parse(normalized);
  const headings = [];

  for (const child of doc.children ?? []) {
    if (child.type === 'section') {
      walkSection(child, headings);
    }
  }

  const titleSetting = settings.title;
  const authorSetting = settings.author;
  const todoSetting = settings.todo;

  let todoKeywords = ['TODO', 'DONE'];
  if (typeof todoSetting === 'string') {
    todoKeywords = todoSetting.split(/\s+/).filter(Boolean);
  } else if (Array.isArray(todoSetting)) {
    todoKeywords = todoSetting.flatMap((entry) => entry.split(/\s+/)).filter(Boolean);
  }

  return {
    keywords: settings,
    headings,
    title: typeof titleSetting === 'string' ? titleSetting : null,
    author: typeof authorSetting === 'string' ? authorSetting : null,
    todoKeywords,
  };
}
