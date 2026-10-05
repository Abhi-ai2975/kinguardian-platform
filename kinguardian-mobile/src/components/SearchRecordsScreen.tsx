import React, { useState, useMemo, useEffect, useCallback, useContext } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import {
  ArrowLeft,
  Search,
  X,
  Mic,
  Pill,
  Calendar,
  History,
  Activity,
  Upload,
  CheckCircle2,
  FolderOpen
} from 'lucide-react-native';
import { HealthRecordItem, DocumentItem } from '../types';
import { DocumentVault } from './DocumentVault';
import { realDataService } from '../services/api-client/RealDataService';
import { AppContext } from '../store/AppContext';

interface SearchRecordsScreenProps {
  records: HealthRecordItem[];
  recentSearches: string[];
  onBack: () => void;
  onSelectRecord: (record: HealthRecordItem) => void;
  onAskAIQuery: (query: string) => void;
  onClearRecentSearches: () => void;
  onRemoveRecentSearch: (search: string) => void;
  documents: DocumentItem[];
  onAddDocument: (doc: DocumentItem) => void;
  showToast: (msg: string) => void;
}

interface TimelineItem {
  id: string;
  dateGroup: 'Today' | 'Yesterday' | 'Aug 14' | 'Aug 12' | string;
  category: 'medication' | 'lab' | 'vital' | 'appointment' | 'document' | 'symptom';
  title: string;
  subtitle: string;
  time: string;
}

const timelineData: TimelineItem[] = [
  {
    id: 'time-1',
    dateGroup: 'Today',
    category: 'medication',
    title: 'Medication taken',
    subtitle: 'Atorvastatin 20mg • Parent',
    time: '8:05 AM'
  },
  {
    id: 'time-2',
    dateGroup: 'Yesterday',
    category: 'vital',
    title: 'Blood pressure recorded',
    subtitle: '142/88 mmHg • Omron Device',
    time: '3:15 PM'
  },
  {
    id: 'time-3',
    dateGroup: 'Yesterday',
    category: 'appointment',
    title: 'Doctor appointment',
    subtitle: 'Cardiology Consultation • Dr. Sharma',
    time: '11:30 AM'
  },
  {
    id: 'time-4',
    dateGroup: 'Aug 14',
    category: 'document',
    title: 'Lab report uploaded',
    subtitle: 'Apollo Fasting Blood Panel scan',
    time: '5:40 PM'
  },
  {
    id: 'time-5',
    dateGroup: 'Aug 12',
    category: 'symptom',
    title: 'Check-in completed',
    subtitle: 'Dad reported feeling fine & hydrated',
    time: '9:00 AM'
  }
];

export const SearchRecordsScreen: React.FC<SearchRecordsScreenProps> = ({
  records,
  recentSearches,
  onBack,
  onSelectRecord,
  onAskAIQuery,
  onClearRecentSearches,
  onRemoveRecentSearch,
  documents,
  onAddDocument,
  showToast
}) => {
  const context = useContext(AppContext);
  const parentName =
    context?.people.find((person) => person.id === context.currentPersonId || person.backendSubjectId === context.currentPersonId)?.name ||
    context?.familyMembers.find((person) => person.id === context.currentPersonId || person.backendSubjectId === context.currentPersonId)?.name ||
    'Parent';
  const [activeSegment, setActiveSegment] = useState<'search' | 'vault'>('search');
  const [searchQuery, setSearchQuery] = useState('');
  const [timelineFilter, setTimelineFilter] = useState<
    'all' | 'medication' | 'lab' | 'vital' | 'appointment' | 'document' | 'symptom'
  >('all');

  const [dbTimelineEvents, setDbTimelineEvents] = useState<TimelineItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [dbSearchResults, setDbSearchResults] = useState<any[]>([]);
  const [isSearchingDb, setIsSearchingDb] = useState(false);

  const fetchTimeline = useCallback(async (isInitial: boolean = false) => {
    try {
      if (!isInitial) setIsLoadingMore(true);
      const cursorToUse = isInitial ? undefined : (nextCursor || undefined);
      const res = await realDataService.getSubjectTimeline('dad', cursorToUse, 10);
      if (res && res.events && res.events.length > 0) {
        const mapped: TimelineItem[] = res.events.map((ev: any) => {
          let cat: TimelineItem['category'] = 'vital';
          if (ev.category === 'medication' || ev.event_type === 'medication_adherence') cat = 'medication';
          else if (ev.category === 'checkin' || ev.event_type === 'checkin') cat = 'symptom';
          else if (ev.category === 'task' || ev.event_type === 'care_task') cat = 'appointment';
          else if (ev.category === 'document') cat = 'document';

          const d = new Date(ev.occurred_at || ev.created_at || Date.now());
          const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const dateStr = d.toLocaleDateString([], { month: 'short', day: 'numeric' });

          return {
            id: ev.id,
            dateGroup: dateStr,
            category: cat,
            title: ev.title || (cat === 'medication' ? 'Medication adherence' : 'Check-in recorded'),
            subtitle: ev.subtitle || (ev.details?.medication_ref ? `${ev.details.medication_ref} confirmed` : 'Care circle update'),
            time: timeStr
          };
        });

        if (isInitial) {
          setDbTimelineEvents(mapped);
        } else {
          // Maintain stable ordering and ensure no duplicates
          setDbTimelineEvents(prev => {
            const seen = new Set(prev.map(p => p.id));
            const fresh = mapped.filter(m => !seen.has(m.id));
            return [...prev, ...fresh];
          });
        }
        setNextCursor(res.next_cursor);
        setHasMore(Boolean(res.has_more));
      } else if (isInitial) {
        setDbTimelineEvents(timelineData);
      }
    } catch (err) {
      console.warn('Failed to fetch real timeline:', err);
      if (isInitial) setDbTimelineEvents(timelineData);
    } finally {
      setIsLoadingMore(false);
    }
  }, [nextCursor]);

  useEffect(() => {
    fetchTimeline(true);
  }, []);

  const handleSearch = async (text: string) => {
    setSearchQuery(text);
    const q = text.trim();
    if (!q) {
      setDbSearchResults([]);
      return;
    }
    setIsSearchingDb(true);
    try {
      const res = await realDataService.search(q);
      setDbSearchResults(res?.results || []);
    } catch (err) {
      console.warn('Search failed:', err);
    } finally {
      setIsSearchingDb(false);
    }
  };

  const timelineFilters = [
    { id: 'all', label: 'All' },
    { id: 'medication', label: 'Medications' },
    { id: 'lab', label: 'Labs' },
    { id: 'vital', label: 'Vitals' },
    { id: 'appointment', label: 'Appointments' },
    { id: 'document', label: 'Documents' },
    { id: 'symptom', label: 'Symptoms' }
  ] as const;

  const currentTimelineData = dbTimelineEvents.length > 0 ? dbTimelineEvents : timelineData;
  const displayTimelineData = useMemo(
    () => currentTimelineData.map((item) => ({ ...item, subtitle: item.subtitle.replace(/\b(?:Parent|Dad)\b/g, parentName) })),
    [currentTimelineData, parentName]
  );

  const filteredTimeline = useMemo(() => {
    if (timelineFilter === 'all') return displayTimelineData;
    return displayTimelineData.filter((item) => item.category === timelineFilter);
  }, [timelineFilter, displayTimelineData]);

  // Grouped timeline helper
  const groupedTimeline = useMemo(() => {
    const groups: { [key: string]: TimelineItem[] } = {};
    filteredTimeline.forEach((item) => {
      if (!groups[item.dateGroup]) {
        groups[item.dateGroup] = [];
      }
      groups[item.dateGroup].push(item);
    });
    return groups;
  }, [filteredTimeline]);

  // Filtered records
  const filteredRecords = useMemo(() => {
    return records.filter((rec) => {
      const matchesCategory = timelineFilter !== 'all' ? rec.category === timelineFilter : true;
      const query = searchQuery.trim().toLowerCase();
      if (!query) return matchesCategory;
      const matchesText =
        rec.title.toLowerCase().includes(query) ||
        (rec.subtitle || '').toLowerCase().includes(query) ||
        (rec.details && rec.details.toLowerCase().includes(query)) ||
        (rec.tag && rec.tag.toLowerCase().includes(query));
      return matchesCategory && matchesText;
    });
  }, [records, timelineFilter, searchQuery]);

  if (activeSegment === 'vault') {
    return (
      <View className="flex-1 bg-[#f2f2f7]">
        {/* Vault Header Segment */}
        <View className="bg-white border-b border-neutral-100 pt-5 pb-3 px-5 space-y-3">
          <View className="flex-row items-center justify-between">
            <TouchableOpacity onPress={onBack} className="p-1.5 bg-neutral-100 rounded-full">
              <ArrowLeft size={16} color="#8e8e93" />
            </TouchableOpacity>
            <Text className="text-lg font-bold text-neutral-900">Health Records</Text>
            <View className="w-8 h-8" />
          </View>

          <View className="flex-row bg-neutral-200/60 p-0.5 rounded-xl">
            <TouchableOpacity
              onPress={() => setActiveSegment('search')}
              className="flex-1 py-1.5 rounded-lg items-center justify-center"
            >
              <Text className="text-xs font-semibold text-neutral-500">Health Timeline</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setActiveSegment('vault')}
              className="flex-1 py-1.5 rounded-lg items-center justify-center bg-white shadow-sm"
            >
              <Text className="text-xs font-bold text-neutral-900">Document Vault</Text>
            </TouchableOpacity>
          </View>
        </View>

        <DocumentVault
          documents={documents}
          onAddDocument={onAddDocument}
          onAskAI={onAskAIQuery}
          showToast={showToast}
        />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-[#f2f2f7]">
      {/* Search Header Segment */}
      <View className="bg-white border-b border-neutral-100 pt-5 pb-3 px-5 space-y-3">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity onPress={onBack} className="p-1.5 bg-neutral-100 rounded-full">
            <ArrowLeft size={16} color="#8e8e93" />
          </TouchableOpacity>
          <Text className="text-lg font-bold text-neutral-900">Health Timeline</Text>
          <View className="w-8 h-8" />
        </View>

        <View className="flex-row bg-neutral-200/60 p-0.5 rounded-xl">
          <TouchableOpacity
            onPress={() => setActiveSegment('search')}
            className="flex-1 py-1.5 rounded-lg items-center justify-center bg-white shadow-sm"
          >
            <Text className="text-xs font-bold text-neutral-900">Health Timeline</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setActiveSegment('vault')}
            className="flex-1 py-1.5 rounded-lg items-center justify-center"
          >
            <Text className="text-xs font-semibold text-neutral-500">Document Vault</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View className="p-5 space-y-6">
        {/* Search Input bar */}
        <View className="relative flex-row items-center bg-white rounded-xl px-4 py-0.5 border border-neutral-200 shadow-xs">
          <Search size={15} color="#8e8e93" />
          <TextInput
            testID="records-search-input"
            accessibilityLabel={`Search timeline and reports for ${parentName}`}
            value={searchQuery}
            onChangeText={handleSearch}
            placeholder={`Search timeline & reports (e.g. ${parentName} medication)...`}
            placeholderTextColor="#8e8e93"
            className="flex-1 px-3 py-3 text-xs text-neutral-800 font-semibold"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => handleSearch('')}>
              <X size={14} color="#ff3b30" />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => onAskAIQuery('Search all recent clinical notes and medications')}
            >
              <Mic size={14} color="#8e8e93" />
            </TouchableOpacity>
          )}
        </View>

        {isSearchingDb && (
          <View className="px-1 py-0.5">
            <Text className="text-[10px] text-blue-500 font-semibold">Searching live care database...</Text>
          </View>
        )}

        {/* Live Database Search Results (TEST SEC-001) */}
        {dbSearchResults.length > 0 && (
          <View testID="records-db-results" className="bg-white rounded-2xl p-4 border border-blue-200 shadow-sm space-y-3">
            <View className="flex-row items-center justify-between border-b border-slate-100 pb-2">
              <View className="flex-row items-center gap-1.5">
                <Search size={14} color="#007aff" />
                <Text testID="records-db-results-count" className="text-xs font-bold text-slate-800">
                  Care Database Matches ({dbSearchResults.length})
                </Text>
              </View>
              <View className="bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <Text className="text-[9px] font-bold text-emerald-700">Verified DB</Text>
              </View>
            </View>

            <View className="space-y-2">
              {dbSearchResults.map((resItem, rIdx) => (
                <View
                  key={resItem.id || rIdx}
                  testID={`records-db-result-${resItem.id || rIdx}`}
                  className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex-row items-center justify-between"
                >
                  <View className="flex-row items-center gap-3 flex-1 pr-2">
                    <View className="w-8 h-8 rounded-full bg-blue-100 items-center justify-center">
                      <Pill size={14} color="#007aff" />
                    </View>
                    <View className="flex-1">
                      <Text testID={`records-db-result-${resItem.id || rIdx}-title`} className="text-xs font-bold text-slate-900">{resItem.title}</Text>
                      <Text testID={`records-db-result-${resItem.id || rIdx}-subtitle`} className="text-[10px] text-slate-500 font-medium">{resItem.subtitle}</Text>
                    </View>
                  </View>
                  <View testID={`records-db-result-${resItem.id || rIdx}-category`} className="bg-white px-2 py-1 rounded border border-slate-200">
                    <Text className="text-[9px] font-bold text-slate-600 uppercase">{resItem.category}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Quick Document Vault Shortcut */}
        <TouchableOpacity
          onPress={() => setActiveSegment('vault')}
          className="bg-blue-50/70 border border-blue-100 p-2.5 rounded-xl flex-row items-center justify-between shadow-xs"
        >
          <View className="flex-row items-center gap-2">
            <FolderOpen size={15} color="#007aff" />
            <View>
              <Text className="text-xs font-bold text-neutral-800">
                Document Vault & Lab Reports ({documents.length})
              </Text>
              <Text className="text-[9px] text-neutral-500 font-medium">
                Apollo_Panel_2026.pdf ready for review
              </Text>
            </View>
          </View>
          <View className="bg-[#007aff] px-2.5 py-1 rounded-lg flex-row items-center gap-1">
            <Upload size={10} color="#ffffff" />
            <Text className="text-[10px] font-bold text-white uppercase">+ Upload Document</Text>
          </View>
        </TouchableOpacity>

        {/* Timeline Horizontal Filters */}
        <View className="space-y-2">
          <Text className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest pl-1">
            Filters
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="flex-row gap-2.5 py-1"
          >
            {timelineFilters.map((filter) => (
              <TouchableOpacity
                key={filter.id}
                onPress={() => setTimelineFilter(filter.id)}
                className={`px-4 py-2 rounded-full border ${
                  timelineFilter === filter.id
                    ? 'bg-[#007aff] border-[#007aff]'
                    : 'bg-white border-neutral-200'
                }`}
              >
                <Text
                  className={`text-xs font-bold ${
                    timelineFilter === filter.id ? 'text-white' : 'text-neutral-700'
                  }`}
                >
                  {filter.label}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Results for active search queries */}
        {searchQuery.trim().length > 0 && (
          <View className="space-y-3">
            <Text className="text-xs font-black text-slate-800">
              Filtered Records ({filteredRecords.length})
            </Text>
            {filteredRecords.length === 0 ? (
              <View className="bg-white rounded-2xl p-6 border border-slate-100 items-center justify-center">
                <Text className="text-xs font-bold text-slate-400">No matching records found.</Text>
              </View>
            ) : (
              <View className="space-y-2.5">
                {filteredRecords.map((rec) => (
                  <TouchableOpacity
                    key={rec.id}
                    onPress={() => onSelectRecord(rec)}
                    className="bg-white rounded-2xl p-4 border border-slate-100 flex-row gap-3 items-start"
                  >
                    <View
                      className={`w-8 h-8 rounded-full ${rec.iconBgColor || 'bg-slate-100'} items-center justify-center shrink-0`}
                    >
                      <Activity size={14} color="#4338ca" />
                    </View>
                    <View className="flex-1 space-y-1">
                      <View className="flex-row justify-between items-start">
                        <Text className="text-xs font-black text-slate-900 truncate max-w-[70%]">
                          {rec.title}
                        </Text>
                        {rec.tag && (
                          <View className="bg-[#eff4ff] px-2 py-0.5 rounded-full shrink-0">
                            <Text className="text-[8px] font-black text-[#4338ca] uppercase">
                              {rec.tag}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                        {rec.subtitle}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* APPROACHABLE TIMELINE BLOCK */}
        {!searchQuery && (
          <View className="space-y-4">
            <Text className="text-xs font-bold text-neutral-400 uppercase tracking-widest pl-1">
              Timeline
            </Text>

            {Object.keys(groupedTimeline).length === 0 ? (
              <View className="bg-white rounded-2xl p-6 border border-neutral-200/80 items-center justify-center">
                <Text className="text-xs font-semibold text-neutral-400">
                  No items match this filter.
                </Text>
              </View>
            ) : (
              <View className="space-y-6 relative pl-3">
                {/* Visual Timeline vertical line */}
                <View className="absolute left-[20px] top-[10px] bottom-[10px] w-0.5 bg-neutral-200" />

                {Object.keys(groupedTimeline).map((date) => (
                  <View key={date} className="space-y-3.5">
                    {/* Date Heading */}
                    <View className="flex-row items-center gap-2">
                      <View className="w-4 h-4 rounded-full bg-white border-[3px] border-[#007aff] z-10" />
                      <Text className="text-xs font-bold text-neutral-800">{date}</Text>
                    </View>

                    {/* Timeline group items */}
                    <View className="space-y-3 pl-6">
                      {groupedTimeline[date].map((item) => {
                        const iconColor =
                          item.category === 'medication'
                            ? '#007aff'
                            : item.category === 'vital'
                              ? '#ff3b30'
                              : item.category === 'appointment'
                                ? '#ff9500'
                                : item.category === 'document'
                                  ? '#34c759'
                                  : '#8e8e93';

                        return (
                          <View
                            key={item.id}
                            testID={`records-timeline-item-${item.id}`}
                            className="bg-white rounded-2xl p-4 border border-neutral-100 flex-row items-center justify-between shadow-xs"
                          >
                            <View className="flex-row items-center gap-3.5">
                              <View className="w-8 h-8 rounded-full bg-neutral-50 items-center justify-center border border-neutral-100">
                                {item.category === 'medication' ? (
                                  <Pill size={14} color={iconColor} />
                                ) : item.category === 'vital' ? (
                                  <Activity size={14} color={iconColor} />
                                ) : item.category === 'appointment' ? (
                                  <Calendar size={14} color={iconColor} />
                                ) : item.category === 'document' ? (
                                  <Upload size={14} color={iconColor} />
                                ) : (
                                  <CheckCircle2 size={14} color={iconColor} />
                                )}
                              </View>
                              <View className="space-y-0.5">
                                <Text className="text-xs font-bold text-neutral-800">
                                  {item.title}
                                </Text>
                                <Text className="text-[10px] text-neutral-400 font-semibold">
                                  {item.subtitle}
                                </Text>
                              </View>
                            </View>
                            <Text className="text-[9px] font-bold text-neutral-400">
                              {item.time}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Cursor Pagination Button (TEST SEC-002) */}
            {hasMore && (
              <TouchableOpacity
                testID="records-load-more"
                accessibilityLabel="Load more timeline events, cursor pagination"
                onPress={() => fetchTimeline(false)}
                disabled={isLoadingMore}
                className="bg-white border border-blue-200 py-3 rounded-2xl items-center justify-center my-2 active:bg-blue-50 shadow-xs"
              >
                {isLoadingMore ? (
                  <ActivityIndicator testID="records-load-more-spinner" size="small" color="#007aff" />
                ) : (
                  <Text className="text-xs font-bold text-[#007aff]">
                    Load More Events (Cursor Pagination) &darr;
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Recent Searches */}
        {!searchQuery && (
          <View className="space-y-3 pb-12">
            <View className="flex-row items-center justify-between border-b border-neutral-200/80 pb-2">
              <Text className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">
                Recent Searches
              </Text>
              {recentSearches.length > 0 && (
                <TouchableOpacity onPress={onClearRecentSearches}>
                  <Text className="text-xs font-bold text-[#007aff]">Clear All</Text>
                </TouchableOpacity>
              )}
            </View>

            {recentSearches.length === 0 ? (
              <Text className="text-[10px] text-neutral-400 italic font-bold">
                No recent searches.
              </Text>
            ) : (
              <View className="space-y-2">
                {recentSearches.map((item, idx) => (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => setSearchQuery(item)}
                    className="bg-white rounded-2xl p-3 border border-neutral-100 flex-row justify-between items-center"
                  >
                    <View className="flex-row items-center gap-3">
                      <History size={14} color="#8e8e93" />
                      <Text className="text-xs font-bold text-neutral-800">{item}</Text>
                    </View>
                    <TouchableOpacity onPress={() => onRemoveRecentSearch(item)}>
                      <X size={14} color="#8e8e93" />
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}
        <View className="h-28" />
      </View>
    </ScrollView>
  );
};
