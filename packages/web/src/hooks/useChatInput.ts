import {
  useState,
  useLayoutEffect,
  useRef,
  useEffect,
  useCallback,
} from 'react';
import type { SuggestionDataItem } from 'react-mentions';
import { listLibraries, SimpleLibrary } from '@/services/api/library.api';
import { getSourcesByLibraryId } from '@/services/api/source.api';

interface Mention {
  id: string;
  display: string;
}

export function useChatInput(
  onSend: (payload: {
    content: string;
    agentMode: string;
    sourceIds?: string[];
    libraryIds?: string[];
    webSearchEnabled?: boolean;
  }) => void,
  agentMode: string,
  webSearchEnabled: boolean = false,
) {
  const [value, setValue] = useState('');
  const [plainText, setPlainText] = useState('');
  const [mentions, setMentions] = useState<Mention[]>([]);
  const [allLibraries, setAllLibraries] = useState<SimpleLibrary[]>([]);
  const [isSourceMenuOpen, setIsSourceMenuOpen] = useState(false);
  const [librariesWithSources, setLibrariesWithSources] = useState<
    Array<{ library: SimpleLibrary; sources: any[] }>
  >([]);
  const [expandedLibraries, setExpandedLibraries] = useState<Set<string>>(
    new Set(),
  );

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    listLibraries()
      .then(setAllLibraries)
      .catch((err) => {
        console.error('[ChatInput] Error fetching libraries:', err);
      });
  }, []);

  const adjustHeight = () => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = `${ta.scrollHeight}px`;
    }
  };

  useLayoutEffect(adjustHeight, [value]);

  const handleSend = () => {
    if (!plainText.trim()) return;

    // Mentions are library IDs (from @ mentions)
    const libraryIds = mentions.map((m) => m.id);

    let xmlContent = plainText;

    mentions.forEach((mention) => {
      // The mention.display may have spaces, so we need to trim it
      const displayName = mention.display.trim();
      // Create pattern that matches the mention in the plain text
      const mentionPattern = new RegExp(
        `${displayName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`,
        'g',
      );
      xmlContent = xmlContent.replace(
        mentionPattern,
        `<library id="${mention.id}" name="${displayName}">${displayName}</library>`,
      );
    });

    console.log('[ChatInput] Sending message:', {
      plainText,
      xmlContent,
      mentions,
      libraryIds,
      agentMode,
      webSearchEnabled,
    });

    onSend({ content: xmlContent, libraryIds, agentMode, webSearchEnabled });
    setValue('');
    setPlainText('');
    setMentions([]);
  };

  const handleChange = (
    e: any,
    newValue: string,
    newPlainTextValue: string,
    mentions: Mention[],
  ) => {
    setValue(newValue);
    setPlainText(newPlainTextValue);
    setMentions(mentions);
  };

  const loadLibrariesWithSources = async () => {
    try {
      const libs = await listLibraries();
      const libsWithSources = await Promise.all(
        libs.map(async (lib) => {
          const sources = await getSourcesByLibraryId(lib.id);
          return { library: lib, sources };
        }),
      );
      setLibrariesWithSources(libsWithSources);
    } catch (err) {
      console.error('[ChatInput] Error loading libraries with sources:', err);
    }
  };

  const toggleSourceMenu = () => {
    if (!isSourceMenuOpen) {
      loadLibrariesWithSources();
    }
    setIsSourceMenuOpen(!isSourceMenuOpen);
  };

  const toggleLibrary = (libraryId: string) => {
    setExpandedLibraries((prev) => {
      const next = new Set(prev);
      if (next.has(libraryId)) {
        next.delete(libraryId);
      } else {
        next.add(libraryId);
      }
      return next;
    });
  };

  const getSelectedSourceIds = useCallback((): Set<string> => {
    return new Set(mentions.map((m) => m.id));
  }, [mentions]);

  const isLibrarySelected = useCallback(
    (libraryId: string): boolean => {
      return mentions.some((m) => m.id === libraryId);
    },
    [mentions],
  );

  const libraryData: SuggestionDataItem[] = allLibraries.map((lib) => ({
    id: lib.id,
    display: lib.title,
  }));

  return {
    value,
    textareaRef,
    isSourceMenuOpen,
    librariesWithSources,
    expandedLibraries,
    handleSend,
    handleChange,
    toggleSourceMenu,
    toggleLibrary,
    getSelectedSourceIds,
    isLibrarySelected,
    libraryData,
    plainText,
  };
}
