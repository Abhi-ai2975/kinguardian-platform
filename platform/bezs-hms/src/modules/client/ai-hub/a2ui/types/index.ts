export interface StringValue {
  path?: string;
  literalString?: string;
  literal?: string;
}

export interface NumberValue {
  path?: string;
  literalNumber?: number;
  literal?: number;
}

export interface BooleanValue {
  path?: string;
  literalBoolean?: boolean;
  literal?: boolean;
}

export interface Action {
  name: string;
  context?: Array<{
    key: string;
    value: StringValue | NumberValue | BooleanValue;
  }>;
}

export interface Text {
  text: StringValue;
  usageHint?:
    | "h1"
    | "h2"
    | "h3"
    | "h4"
    | "h5"
    | "body"
    | "caption"
    | "monospaced";
}

export interface Image {
  url: StringValue;
  fit?: "cover" | "contain" | "fill" | "none" | "scaleDown";
  usageHint?:
    | "default"
    | "avatar"
    | "hero"
    | "icon"
    | "smallFeature"
    | "mediumFeature"
    | "largeFeature"
    | "header";
  altText?: StringValue;
}

export interface Icon {
  name: StringValue;
  size?: "small" | "medium" | "large";
}

export interface Video {
  url: StringValue;
}

export interface AudioPlayer {
  url: StringValue;
  description?: StringValue;
}

export interface Divider {
  axis?: "horizontal" | "vertical";
  thickness?: number;
}

export interface Button {
  child: string;
  action?: Action;
  primary?: boolean;
}

export interface TextField {
  label?: StringValue;
  text?: StringValue;
  textFieldType?: "shortText" | "longText" | "number" | "date" | "obscured";
  placeholder?: StringValue;
  /** Named class slots for targeting specific DOM layers of this component. */
  classNames?: {
    /** The outer wrapper div (space-y-2). */
    root?: string;
    /** The <Label> element. */
    label?: string;
    /** The <Input> or <Textarea> element. */
    input?: string;
  };
}

export interface Checkbox {
  label?: StringValue;
  value?: BooleanValue;
}

export interface Slider {
  label?: StringValue;
  value?: NumberValue;
  min?: NumberValue;
  max?: NumberValue;
  step?: NumberValue;
  minValue?: number;
  maxValue?: number;
}

export interface DatePicker {
  /**
   * Selection mode.
   * - "single"   → one date; outputs one hidden input with id = component.id
   * - "range"    → start + end; outputs two inputs: {id}_from and {id}_to
   * - "multiple" → arbitrary dates; outputs one hidden input as a JSON array
   * Default: "single"
   */
  mode?: "single" | "range" | "multiple";

  /** Label displayed above the trigger button. */
  label?: StringValue;

  /** Placeholder text shown in the trigger when no date is selected. */
  placeholder?: StringValue;

  /**
   * Pre-filled date value (parsed as ISO YYYY-MM-DD or any valid Date string).
   * In "range" mode this seeds the start / from date.
   * Supports context path references: { path: "$schedule_start" }
   */
  value?: StringValue;

  /**
   * Pre-filled range end date.
   * Only consumed when mode="range".
   * Supports context path references: { path: "$schedule_end" }
   */
  valueTo?: StringValue;

  /**
   * date-fns format token string written to the hidden input(s) — this is what
   * the backend receives. Default: "yyyy-MM-dd"
   * Examples: "yyyy-MM-dd", "yyyy-MM-dd'T'HH:mm:ss", "MM/dd/yyyy"
   */
  outputFormat?: string;

  /**
   * date-fns format token string displayed inside the trigger button.
   * Default: "PPP" (e.g., "Jul 7, 2025")
   * Examples: "PPP", "dd MMM yyyy", "EEE, MMM d"
   */
  displayFormat?: string;

  /**
   * Minimum selectable date — days before this are greyed out and unclickable.
   * Supports context path: { path: "$schedule_horizon_start" }
   * Navigation is also clamped so the calendar cannot go before this month.
   */
  fromDate?: StringValue;

  /**
   * Maximum selectable date — days after this are greyed out and unclickable.
   * Supports context path: { path: "$schedule_horizon_end" }
   * Navigation is clamped so the calendar cannot go past this month.
   */
  toDate?: StringValue;

  /**
   * Caption layout style for the month/year header.
   * - "label"           → plain text (default)
   * - "dropdown"        → dropdowns for both month and year
   * - "dropdown-months" → month dropdown, year as text
   * - "dropdown-years"  → year dropdown, month as text
   */
  captionLayout?: "label" | "dropdown" | "dropdown-months" | "dropdown-years";

  /**
   * Number of calendar months rendered side by side.
   * Default: 1 for "single"/"multiple" mode, 2 for "range" mode.
   */
  numberOfMonths?: number;

  /**
   * Show days from the previous/next months in the current month grid.
   * Default: true
   */
  showOutsideDays?: boolean;

  /**
   * First day of the week: 0 = Sunday, 1 = Monday, …, 6 = Saturday.
   * Default: 1 (Monday — ISO standard)
   */
  weekStartsOn?: 0 | 1 | 2 | 3 | 4 | 5 | 6;

  /**
   * Disable the entire picker (trigger becomes non-interactive).
   * Supports BooleanValue: true | false | { literalBoolean: true } | { path: "..." }
   * Default: false
   */
  disabled?: boolean | BooleanValue;

  /**
   * Render a required indicator (*) next to the label.
   * Default: false
   */
  required?: boolean;

  /** Named class slots for targeting specific DOM layers of this component. */
  classNames?: {
    /** Outer wrapper div (space-y-2 + flex). */
    root?: string;
    /** The <Label> element above the trigger. */
    label?: string;
    /** The Popover trigger <Button>. */
    trigger?: string;
    /** The PopoverContent panel wrapper. */
    content?: string;
    /** The <Calendar> component root. */
    calendar?: string;
  };
}

export interface DateTimeInput {
  label?: StringValue;
  value?: StringValue;
  enableDate?: boolean;
  enableTime?: boolean;
  outputFormat?: string;
  /** Named class slots for targeting specific DOM layers of this component. */
  classNames?: {
    /** The outer wrapper div (space-y-2). */
    root?: string;
    /** The <Label> element. */
    label?: string;
    /** The <Input> element. */
    input?: string;
  };
}

export interface MultipleChoice {
  label?: StringValue;
  placeholder?: StringValue;
  value?: StringValue;
  items?: Array<{ label: StringValue; value: string }>;
  options?: Array<{ label: StringValue; value: string }>;
  multiSelect?: boolean;
  selections?: any;
  maxAllowedSelections?: number;
}

export interface TerminologySelectServerSearch {
  /** Mode A — field value set (small HL7 enums). Both required together. */
  resource?: string;
  field?: string;
  /** Mode B — full-text search (LOINC / ICD-10 / SNOMED / RxNorm).
   *  Canonical URL e.g. "http://loinc.org". Omit to search all systems. */
  system?: string;
  minChars?: number;
  debounceMs?: number;
}

export interface TerminologySelectType {
  label?: StringValue;
  placeholder?: StringValue;
  /** Resolved array of FHIR concept objects — populated via $variable by mapDataToUI. */
  items?: any;
  /** "code" emits a single hidden input; "CodeableConcept" emits four flattened inputs. */
  valueType?: StringValue;
  serverSearch?: TerminologySelectServerSearch;
  /** Named class slots for targeting specific DOM layers of this component. */
  classNames?: {
    /** The outer wrapper div (space-y-2). */
    root?: string;
    /** The <Label> element. */
    label?: string;
    /** The combobox trigger <Button>. */
    trigger?: string;
  };
}

export interface Tabs {
  tabItems: Array<{ title: StringValue; child: AnyComponentNode }>;
}

export interface Modal {
  entryPointChild: string;
  contentChild: string;
}

export interface Row {
  children?: {
    explicitList?: string[];
    template?: { componentId: string; dataBinding: string };
  };
  alignment?: "start" | "center" | "end" | "stretch";
  distribution?:
    | "start"
    | "center"
    | "end"
    | "spaceBetween"
    | "spaceAround"
    | "spaceEvenly";
  gap?: "none" | "small" | "medium" | "large";
  /** Named class slots for targeting specific DOM layers of this component. */
  classNames?: {
    /** The outer flex container. Use to override the default responsive direction, e.g. "flex-row" to force horizontal on all screens. */
    root?: string;
    /** Applied to every direct child wrapper div (the flex item). */
    item?: string;
  };
}

export interface Column {
  children?: {
    explicitList?: string[];
    template?: { componentId: string; dataBinding: string };
  };
  alignment?: "start" | "center" | "end" | "stretch";
  distribution?:
    | "start"
    | "center"
    | "end"
    | "spaceBetween"
    | "spaceAround"
    | "spaceEvenly";
  gap?: "none" | "small" | "medium" | "large";
  /** Named class slots for targeting specific DOM layers of this component. */
  classNames?: {
    /** The outer flex container. */
    root?: string;
    /** Applied to every direct child wrapper div. */
    item?: string;
  };
}

export interface List {
  children?: {
    explicitList?: string[];
    template?: { componentId: string; dataBinding: string };
  };
  direction?: "vertical" | "horizontal";
}

export interface Card {
  child: string;
}

export interface Form {
  children?: {
    explicitList?: string[];
    template?: { componentId: string; dataBinding: string };
  };
  action?: Action;
  submitLabel?: StringValue;
  gap?: "none" | "small" | "medium" | "large";
  alignment?: "start" | "center" | "end" | "stretch";
  /** Named class slots for targeting specific DOM layers of this component. */
  classNames?: {
    /** The outer <form> element. */
    root?: string;
    /** The submit button wrapper area below the field children. */
    footer?: string;
  };
}

export interface SwitchInput {
  label?: StringValue;
  value?: BooleanValue;
}

export interface RadioGroupType {
  label?: StringValue;
  value?: StringValue;
  items?: Array<{ label: StringValue; value: string }>;
  direction?: "horizontal" | "vertical";
}

export interface BadgeType {
  text: StringValue;
  variant?: "default" | "secondary" | "destructive" | "outline";
}

export interface AvatarType {
  url?: StringValue;
  fallback?: StringValue;
  altText?: StringValue;
  size?: "sm" | "default" | "lg";
}

export interface AlertType {
  title?: StringValue;
  description?: StringValue;
  variant?: "default" | "destructive" | "success" | "warning" | "info";
}

export interface ProgressType {
  value?: NumberValue;
  max?: NumberValue;
  label?: StringValue;
}

export interface SpinnerType {
  size?: "small" | "medium" | "large";
  label?: StringValue;
}

export interface AccordionType {
  items?: Array<{ title: StringValue; child: AnyComponentNode }>;
  type?: "single" | "multiple";
}

export interface BreadcrumbType {
  items?: Array<{ label: StringValue; action?: Action }>;
}

export interface SearchField {
  label?: StringValue;
  placeholder?: StringValue;
  text?: StringValue;
  action?: Action;
}

export interface LinkType {
  text: StringValue;
  url: StringValue;
  external?: boolean;
}

export interface SeparatorType {
  orientation?: "horizontal" | "vertical";
  label?: StringValue;
}

// ------------------------------------------------------------------------------

export type DataValue =
  | string
  | number
  | boolean
  | null
  | DataMap
  | DataObject
  | DataArray;
export type DataObject = { [key: string]: DataValue };
export type DataMap = Map<string, DataValue>;
export type DataArray = DataValue[];

export interface ComponentInstance {
  id: string;
  weight?: number;
  component?: {
    [key: string]: any;
  };
}

export interface BeginRenderingMessage {
  surfaceId: string;
  root: string;
  styles?: Record<string, string>;
}

export interface SurfaceUpdateMessage {
  surfaceId: string;
  components: ComponentInstance[];
}

export interface DataModelUpdate {
  surfaceId: string;
  path?: string;
  contents: ValueMap[];
}

export type ValueMap = DataObject & {
  key: string;
  valueString?: string;
  valueNumber?: number;
  valueBoolean?: boolean;
  valueMap?: ValueMap[];
};

export interface DeleteSurfaceMessage {
  surfaceId: string;
}

export interface ServerToClientMessage {
  beginRendering?: BeginRenderingMessage;
  surfaceUpdate?: SurfaceUpdateMessage;
  dataModelUpdate?: DataModelUpdate;
  deleteSurface?: DeleteSurfaceMessage;
}

export interface A2UIClientEventMessage {
  userAction: {
    name: string;
    sourceComponentId: string;
    surfaceId?: string;
    timestamp: string;
    context?: { [k: string]: unknown };
  };
}

export type ResolvedValue =
  | string
  | number
  | boolean
  | null
  | AnyComponentNode
  | ResolvedMap
  | ResolvedArray;
export type ResolvedMap = { [key: string]: ResolvedValue };
export type ResolvedArray = ResolvedValue[];

interface BaseComponentNode {
  id: string;
  weight?: number;
  dataContextPath?: string;
  slotName?: string;
  className?: string;
}

export interface TextNode extends BaseComponentNode {
  type: "Text";
  properties: Text;
}

export interface ImageNode extends BaseComponentNode {
  type: "Image";
  properties: Image;
}

export interface IconNode extends BaseComponentNode {
  type: "Icon";
  properties: Icon;
}

export interface VideoNode extends BaseComponentNode {
  type: "Video";
  properties: Video;
}

export interface AudioPlayerNode extends BaseComponentNode {
  type: "AudioPlayer";
  properties: AudioPlayer;
}

export interface RowNode extends BaseComponentNode {
  type: "Row";
  properties: Row & { children: AnyComponentNode[] };
}

export interface ColumnNode extends BaseComponentNode {
  type: "Column";
  properties: Column & { children: AnyComponentNode[] };
}

export interface ListNode extends BaseComponentNode {
  type: "List";
  properties: List & { children: AnyComponentNode[] };
}

export interface CardNode extends BaseComponentNode {
  type: "Card";
  properties: Card & { child: AnyComponentNode };
}

export interface FormNode extends BaseComponentNode {
  type: "Form";
  properties: Form & { children: AnyComponentNode[] };
}

export interface SwitchNode extends BaseComponentNode {
  type: "Switch";
  properties: SwitchInput;
}

export interface RadioGroupNode extends BaseComponentNode {
  type: "RadioGroup";
  properties: RadioGroupType;
}

export interface BadgeNode extends BaseComponentNode {
  type: "Badge";
  properties: BadgeType;
}

export interface AvatarNode extends BaseComponentNode {
  type: "Avatar";
  properties: AvatarType;
}

export interface AlertNode extends BaseComponentNode {
  type: "Alert";
  properties: AlertType;
}

export interface ProgressNode extends BaseComponentNode {
  type: "Progress";
  properties: ProgressType;
}

export interface SpinnerNode extends BaseComponentNode {
  type: "Spinner";
  properties: SpinnerType;
}

export interface AccordionNode extends BaseComponentNode {
  type: "Accordion";
  properties: AccordionType;
}

export interface BreadcrumbNode extends BaseComponentNode {
  type: "Breadcrumb";
  properties: BreadcrumbType;
}

export interface SearchFieldNode extends BaseComponentNode {
  type: "SearchField";
  properties: SearchField;
}

export interface LinkNode extends BaseComponentNode {
  type: "Link";
  properties: LinkType;
}

export interface SeparatorNode extends BaseComponentNode {
  type: "Separator";
  properties: SeparatorType;
}

export interface TabsNode extends BaseComponentNode {
  type: "Tabs";
  properties: Tabs;
}

export interface DividerNode extends BaseComponentNode {
  type: "Divider";
  properties: Divider;
}

export interface ModalNode extends BaseComponentNode {
  type: "Modal";
  properties: Modal & {
    entryPointChild: AnyComponentNode;
    contentChild: AnyComponentNode;
  };
}

export interface ButtonNode extends BaseComponentNode {
  type: "Button";
  properties: Button & { child: AnyComponentNode };
}

export interface CheckboxNode extends BaseComponentNode {
  type: "CheckBox";
  properties: Checkbox;
}

export interface TextFieldNode extends BaseComponentNode {
  type: "TextField";
  properties: TextField;
}

export interface DatePickerNode extends BaseComponentNode {
  type: "DatePicker";
  properties: DatePicker;
}

export interface DateTimeInputNode extends BaseComponentNode {
  type: "DateTimeInput";
  properties: DateTimeInput;
}

export interface MultipleChoiceNode extends BaseComponentNode {
  type: "MultipleChoice";
  properties: MultipleChoice;
}

export interface TerminologySelectNode extends BaseComponentNode {
  type: "TerminologySelect";
  properties: TerminologySelectType;
}

export interface RepeatableGroupType {
  label?: StringValue;
  addLabel?: StringValue;
  removeLabel?: StringValue;
  minItems?: NumberValue;
  maxItems?: NumberValue;
  defaultCount?: NumberValue;
  allowDuplicate?: BooleanValue;
  template: AnyComponentNode[];
}

export interface RepeatableGroupNode extends BaseComponentNode {
  type: "RepeatableGroup";
  properties: RepeatableGroupType;
}

export interface DataSelectEmit {
  key: string;
  path: string;
}

// ── DynamicSelect types ──────────────────────────────────────────────────────

/**
 * API source config for DynamicSelect server-side search.
 * The component POSTs to /api/workflow/dynamic-select which proxies to the FHIR server.
 */
export interface DynamicSelectSource {
  /**
   * URL template for the FHIR endpoint. Supports $fhir_gql_url placeholder
   * (resolved server-side by the proxy). Other path variables should go in staticParams.
   * Example: "$fhir_gql_url/api/v1/organizations/"
   */
  url: string;
  /**
   * Key-value pairs always included in every request. Values support StringValue /
   * NumberValue form so they can reference workflow session context (e.g. org_id).
   */
  staticParams?: Record<string, StringValue | NumberValue | string | number>;
  /** Query param key appended with the live search term. Default: "search". */
  searchParam?: string;
  /** Dot-path into the API response JSON to extract the items array. Default: "" (root). */
  responsePath?: string;
  /**
   * Minimum characters before server search fires. Default: 2.
   * Set to 0 to fetch immediately when the dropdown opens (no typing required).
   */
  minChars?: number;
  /** Debounce delay in ms. Default: 300. */
  debounceMs?: number;
  /** Number of items per page — sent as the limit param. Default: 10. */
  pageSize?: number;
  /** Query param name for the page size / limit. Default: "limit". */
  limitParam?: string;
  /** Query param name for the pagination offset. Default: "offset". */
  offsetParam?: string;
}

/** Template or path spec for a single display field within a DynamicSelect row. */
export interface DynamicSelectDisplayField {
  /** Dot-path into the item object (e.g. "name.text"). */
  path?: string;
  /**
   * Template string combining multiple fields (e.g. "{first_name} {last_name}").
   * Takes precedence over path when both are set.
   */
  template?: string;
}

/** Configuration for one badge/tag rendered in a DynamicSelect dropdown row. */
export interface DynamicSelectTag {
  /** Dot-path into the item for the tag text. */
  path?: string;
  /** Template string for the tag text; takes precedence over path. */
  template?: string;
}

/** Controls what is rendered in each DynamicSelect dropdown row. */
export interface DynamicSelectDisplay {
  /** Primary bold line shown in the trigger button and as the first row line. Required. */
  label: DynamicSelectDisplayField;
  /** Optional secondary muted line shown below the label in each row. */
  description?: DynamicSelectDisplayField;
  /** Optional array of small badge chips rendered below the description. */
  tags?: DynamicSelectTag[];
}

/**
 * One emit entry: on selection, writes a hidden input {componentId}_{key} with the
 * derived value. Use `path` for a raw field value, or `template` to compose a value
 * from multiple fields (e.g. "Organization/{id}" for FHIR references).
 */
export interface DynamicSelectEmit {
  /** Hidden input key suffix — the full input id is {componentId}_{key}. */
  key: string;
  /** Dot-path into the selected item for a raw value (e.g. "id"). */
  path?: string;
  /**
   * Template string combining multiple fields. {field} tokens are resolved against
   * the selected item. Example: "Organization/{id}" emits "Organization/42".
   * Takes precedence over path when both are set.
   */
  template?: string;
}

/**
 * Properties for the DynamicSelect A2UI component.
 *
 * Supports three search modes:
 *   - Client-only: items pre-loaded from context (no source), filtered in the browser.
 *   - Server-only: source defined, empty items — server search from first keypress.
 *   - Hybrid: items pre-loaded AND source defined — shows static items initially,
 *     switches to server results once the user types ≥ minChars.
 */
export interface DynamicSelectType {
  label?: StringValue;
  placeholder?: StringValue;
  /** API source config. When present, enables server-side debounced search. */
  source?: DynamicSelectSource;
  /** Pre-loaded items from workflow context (resolved via $variable by the A2UI processor). */
  items?: any;
  /** Controls what to render in each dropdown row and the trigger button label. */
  display: DynamicSelectDisplay;
  /**
   * Hidden inputs to write on selection. Each entry maps a key to a dot-path in the
   * selected item. form.tsx collectFormData collects these as {componentId}_{key}.
   */
  emits?: DynamicSelectEmit[];
  /** Named class slots for targeting specific DOM layers. */
  classNames?: {
    root?: string;
    label?: string;
    trigger?: string;
  };
}

export interface DynamicSelectNode extends BaseComponentNode {
  type: "DynamicSelect";
  properties: DynamicSelectType;
}

export interface DataSelectType {
  label?: StringValue;
  placeholder?: StringValue;
  /** Resolved array from context via $variable — any object shape. */
  items?: any;
  /** Dot-path into each item for the primary display label (e.g. "practitioner_detail.name.text"). Supports "path | formatter" syntax. */
  labelPath?: string;
  /** Template string for the primary label combining multiple fields, e.g. "{start | time} – {end | time}". Takes precedence over labelPath when set. */
  labelTemplate?: string;
  /** Dot-path for an optional secondary description line (e.g. "specialty.0.coding_display"). Supports "path | formatter" syntax. */
  descriptionPath?: string;
  /** Template string for the description combining multiple fields, e.g. "{start | short_date} · {comment}". Takes precedence over descriptionPath when set. */
  descriptionTemplate?: string;
  /** On selection, writes hidden inputs {id}_{key} = item[path] for each entry. */
  emits?: DataSelectEmit[];
}

export interface DataSelectNode extends BaseComponentNode {
  type: "DataSelect";
  properties: DataSelectType;
}

export interface SlotPickerType {
  label?: StringValue;
  /** Resolved array of slot objects from context (each must have id, start, end as ISO strings). */
  items?: any;
  /** On selection, writes hidden inputs {id}_{key} = item[path] for each entry — same contract as DataSelect.emits. */
  emits?: DataSelectEmit[];
}

export interface SlotPickerNode extends BaseComponentNode {
  type: "SlotPicker";
  properties: SlotPickerType;
}

export interface SliderNode extends BaseComponentNode {
  type: "Slider";
  properties: Slider;
}

export interface FileUploadType {
  /** Label shown above the drop zone. */
  label?: StringValue;
  /**
   * Base URL of the server-side token endpoint (e.g. "/api/filenest-token").
   * The component appends `folder` and `patientFhirId` query params as needed.
   * Required — no default is assumed because different upload steps may use
   * different folder scopes.
   */
  tokenEndpoint: StringValue;
  /**
   * Full nested folder path for the upload, e.g. "10000/servicerequest/xray".
   * Sent to the token endpoint as `filePath` in the POST body. The route creates
   * all missing segments via ensurePath. Supports $variable path resolution from
   * the current data context, e.g. { "path": "$uploadPath" } where uploadPath is
   * set in the workflow's sessionContext.
   */
  filePath?: StringValue;
  /** MIME types shown as a hint and sent to the route as the `allowedMimeTypes` constraint. */
  allowedMimeTypes?: string[];
  /** Max file count. Sent to the route as `maxFiles`. Default 1. */
  maxFiles?: NumberValue;
  /** Max upload size in MB. Sent to the route as `maxSize` (converted to bytes). Default 5. */
  maxSizeMb?: NumberValue;
  /**
   * Arbitrary key-value metadata embedded in every FileNest file record uploaded
   * with this token. Each value is resolved from the current data context, so
   * paths like `{ "path": "$patientFhirId" }` are supported alongside literals.
   */
  metadata?: Record<string, StringValue | NumberValue | BooleanValue>;
  /**
   * Auth user id sent as `userId` in the token request body, overriding the
   * session-derived value on the server. Supports $variable resolution.
   */
  userId?: StringValue;
  /**
   * Organisation id sent as `orgId` in the token request body, overriding the
   * session-derived value on the server. Supports $variable resolution.
   */
  orgId?: StringValue;
  /**
   * When false, selected files are staged locally and an "Upload" button must
   * be clicked before the upload begins. Default true (upload on selection).
   */
  autoUpload?: boolean;
}

export interface FileUploadNode extends BaseComponentNode {
  type: "FileUpload";
  properties: FileUploadType;
}

export interface MarkdownContent {
  content: StringValue;
}

export interface Chart {
  spec?: { [key: string]: any };
  values?: Array<{ [key: string]: any }>;
  width?: number | string;
  height?: number | string;
  autoFilter?: boolean;
  hideActions?: boolean;
  hideTitle?: boolean;
  hideLegend?: boolean;
}

export interface ChartNode extends BaseComponentNode {
  type: "Chart";
  properties: Chart;
}

export interface MarkdownNode extends BaseComponentNode {
  type: "Markdown";
  properties: MarkdownContent;
}

export interface CustomNode extends BaseComponentNode {
  type: string;
  properties: { [key: string]: ResolvedValue };
}

// ── Chart types ─────────────────────────────────────────────────────────────

export interface ChartSeries {
  key: string;
  name?: string;
  color?: string;
}

export interface BarChartType {
  data: Array<Record<string, any>>;
  series: ChartSeries[];
  xKey?: string;
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  stacked?: boolean;
  exportable?: boolean;
  title?: string;
}

export interface LineChartType {
  data: Array<Record<string, any>>;
  series: ChartSeries[];
  xKey?: string;
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  exportable?: boolean;
  title?: string;
}

export interface AreaChartType {
  data: Array<Record<string, any>>;
  series: ChartSeries[];
  xKey?: string;
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  stacked?: boolean;
  fillOpacity?: number;
  exportable?: boolean;
  title?: string;
}

export interface PieChartType {
  data: Array<{ label: string; value: number; color?: string }>;
  innerRadius?: number;
  height?: number;
  showLegend?: boolean;
  exportable?: boolean;
  title?: string;
}

export interface BarChartNode extends BaseComponentNode {
  type: "BarChart";
  properties: BarChartType;
}

export interface LineChartNode extends BaseComponentNode {
  type: "LineChart";
  properties: LineChartType;
}

export interface AreaChartNode extends BaseComponentNode {
  type: "AreaChart";
  properties: AreaChartType;
}

export interface PieChartNode extends BaseComponentNode {
  type: "PieChart";
  properties: PieChartType;
}

// ── Dashboard components ─────────────────────────────────────────────────────

export interface DashboardCardType {
  title: string;
  subtitle?: string;
  /** Named class slots for targeting specific DOM layers of this component. */
  classNames?: {
    /** The outer card div. */
    root?: string;
    /** The title/subtitle header area. */
    header?: string;
    /** The child content area. */
    body?: string;
  };
}

export interface DashboardCardNode extends BaseComponentNode {
  type: "DashboardCard";
  properties: DashboardCardType & { child?: AnyComponentNode };
}

export interface MetricType {
  label: string;
  value: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
}

export interface MetricNode extends BaseComponentNode {
  type: "Metric";
  properties: MetricType;
}

// ── DataTable ────────────────────────────────────────────────────────────────

export interface DataTableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
}

export interface DataTableQueryParams {
  supported: string[];
  defaults: Record<string, any>;
  pageParam?: string;
  offsetParam?: string;
  limitParam?: string;
  sortParam?: string;
  searchParam?: string;
  totalPath?: string;
  dataPath?: string;
  rowMapping?: Record<string, string>;
  maxExportLimit?: number;
  filterLabels?: Record<string, string>;
}

export interface DataTablePaginationConfig {
  page: number;
  pageSize: number;
  total: number;
  pageSizeOptions?: number[];
}

export interface DataTableType {
  columns: DataTableColumn[];
  rows: Array<Record<string, any>>;
  pagination?: DataTablePaginationConfig;
  url?: string;
  queryParams?: DataTableQueryParams;
  searchable?: boolean;
  searchPlaceholder?: string;
  exportFormats?: Array<"csv" | "json" | "xlsx" | "pdf">;
  title?: string;
}

export interface DataTableNode extends BaseComponentNode {
  type: "DataTable";
  properties: DataTableType;
}

// ── AnyComponentNode union ───────────────────────────────────────────────────

export type AnyComponentNode =
  | MarkdownNode
  | TextNode
  | FileUploadNode
  | TerminologySelectNode
  | RepeatableGroupNode
  | DataSelectNode
  | DynamicSelectNode
  | SlotPickerNode
  | IconNode
  | ImageNode
  | VideoNode
  | AudioPlayerNode
  | RowNode
  | ColumnNode
  | ListNode
  | CardNode
  | TabsNode
  | DividerNode
  | ModalNode
  | ButtonNode
  | CheckboxNode
  | TextFieldNode
  | DatePickerNode
  | DateTimeInputNode
  | MultipleChoiceNode
  | SliderNode
  | CustomNode
  | TableNode
  | ChartNode
  | FormNode
  | SwitchNode
  | RadioGroupNode
  | BadgeNode
  | AvatarNode
  | AlertNode
  | ProgressNode
  | SpinnerNode
  | AccordionNode
  | BreadcrumbNode
  | SearchFieldNode
  | LinkNode
  | SeparatorNode
  | BarChartNode
  | LineChartNode
  | AreaChartNode
  | PieChartNode
  | DashboardCardNode
  | MetricNode
  | DataTableNode;

export interface Theme {
  components: {
    AudioPlayer: Record<string, boolean>;
    Button: Record<string, boolean>;
    Card: Record<string, boolean>;
    Column: Record<string, boolean>;
    CheckBox: {
      container: Record<string, boolean>;
      element: Record<string, boolean>;
      label: Record<string, boolean>;
    };
    DateTimeInput: {
      container: Record<string, boolean>;
      element: Record<string, boolean>;
      label: Record<string, boolean>;
    };
    Divider: Record<string, boolean>;
    Form: Record<string, boolean>;
    Image: {
      all: Record<string, boolean>;
      icon: Record<string, boolean>;
      avatar: Record<string, boolean>;
      smallFeature: Record<string, boolean>;
      mediumFeature: Record<string, boolean>;
      largeFeature: Record<string, boolean>;
      header: Record<string, boolean>;
    };
    Icon: Record<string, boolean>;
    List: Record<string, boolean>;
    Modal: {
      backdrop: Record<string, boolean>;
      element: Record<string, boolean>;
    };
    MultipleChoice: {
      container: Record<string, boolean>;
      element: Record<string, boolean>;
      label: Record<string, boolean>;
    };
    Row: Record<string, boolean>;
    Slider: {
      container: Record<string, boolean>;
      element: Record<string, boolean>;
      label: Record<string, boolean>;
    };
    Tabs: {
      container: Record<string, boolean>;
      element: Record<string, boolean>;
      controls: {
        all: Record<string, boolean>;
        selected: Record<string, boolean>;
      };
    };
    Text: {
      all: Record<string, boolean>;
      h1: Record<string, boolean>;
      h2: Record<string, boolean>;
      h3: Record<string, boolean>;
      h4: Record<string, boolean>;
      h5: Record<string, boolean>;
      caption: Record<string, boolean>;
      body: Record<string, boolean>;
    };
    TextField: {
      container: Record<string, boolean>;
      element: Record<string, boolean>;
      label: Record<string, boolean>;
    };
    Video: Record<string, boolean>;
    Switch: Record<string, boolean>;
    RadioGroup: Record<string, boolean>;
    Badge: Record<string, boolean>;
    Avatar: Record<string, boolean>;
    Alert: Record<string, boolean>;
    Progress: Record<string, boolean>;
    Spinner: Record<string, boolean>;
    Accordion: Record<string, boolean>;
    Breadcrumb: Record<string, boolean>;
    SearchField: Record<string, boolean>;
    Link: Record<string, boolean>;
    Separator: Record<string, boolean>;
  };
  elements: {
    a: Record<string, boolean>;
    audio: Record<string, boolean>;
    body: Record<string, boolean>;
    button: Record<string, boolean>;
    h1: Record<string, boolean>;
    h2: Record<string, boolean>;
    h3: Record<string, boolean>;
    h4: Record<string, boolean>;
    h5: Record<string, boolean>;
    iframe: Record<string, boolean>;
    input: Record<string, boolean>;
    p: Record<string, boolean>;
    pre: Record<string, boolean>;
    textarea: Record<string, boolean>;
    video: Record<string, boolean>;
  };
  markdown: {
    p: string[];
    h1: string[];
    h2: string[];
    h3: string[];
    h4: string[];
    h5: string[];
    ul: string[];
    ol: string[];
    li: string[];
    a: string[];
    strong: string[];
    em: string[];
  };
  additionalStyles?: {
    AudioPlayer?: Record<string, string>;
    Button?: Record<string, string>;
    Card?: Record<string, string>;
    Column?: Record<string, string>;
    CheckBox?: Record<string, string>;
    DateTimeInput?: Record<string, string>;
    Divider?: Record<string, string>;
    Heading?: Record<string, string>;
    Icon?: Record<string, string>;
    Image?: Record<string, string>;
    List?: Record<string, string>;
    Modal?: Record<string, string>;
    MultipleChoice?: Record<string, string>;
    Row?: Record<string, string>;
    Slider?: Record<string, string>;
    Tabs?: Record<string, string>;
    Text?:
      | Record<string, string>
      | {
          h1: Record<string, string>;
          h2: Record<string, string>;
          h3: Record<string, string>;
          h4: Record<string, string>;
          h5: Record<string, string>;
          body: Record<string, string>;
          caption: Record<string, string>;
        };
    TextField?: Record<string, string>;
    Video?: Record<string, string>;
  };
}

// Table component (additional)
export interface Table {
  headers: string[];
  data: string[][];
}

export interface TableNode extends BaseComponentNode {
  type: "Table";
  properties: Table;
}
