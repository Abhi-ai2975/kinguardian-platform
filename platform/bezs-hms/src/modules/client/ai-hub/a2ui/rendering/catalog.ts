import { Text } from "../catalog/text";
import { Row } from "../catalog/row";
import { Column } from "../catalog/column";
import { Image } from "../catalog/image";
import { Icon } from "../catalog/icon";
import { Button } from "../catalog/button";
import { Card } from "../catalog/card";
import { Tabs } from "../catalog/tabs";
import { Modal } from "../catalog/modal";
import { Checkbox } from "../catalog/checkbox";
import { TextField } from "../catalog/text-field";
import { DateTimeInput } from "../catalog/datetime-input";
import { DatePicker } from "../catalog/DatePicker";
import { Slider } from "../catalog/slider";
import { MultipleChoice } from "../catalog/multiple-choice";
import { List } from "../catalog/list";
import { Divider } from "../catalog/divider";
import { Video } from "../catalog/video";
import { AudioPlayer } from "../catalog/audio-player";
import { Table } from "../catalog/table";
import { Form } from "../catalog/form";
import { Switch } from "../catalog/switch";
import { RadioGroup } from "../catalog/radio-group";
import { Badge } from "../catalog/badge";
import { Avatar } from "../catalog/avatar";
import { Alert } from "../catalog/alert";
import { Progress } from "../catalog/progress";
import { Spinner } from "../catalog/spinner";
import { Accordion } from "../catalog/accordion";
import { Breadcrumb } from "../catalog/breadcrumb";
import { SearchField } from "../catalog/search-field";
import { Link } from "../catalog/link";
import { Separator } from "../catalog/separator";
import { Markdown } from "../catalog/markdown";
import { BarChart } from "../catalog/bar-chart";
import { LineChart } from "../catalog/line-chart";
import { AreaChart } from "../catalog/area-chart";
import { PieChart } from "../catalog/pie-chart";
import { DashboardCard } from "../catalog/dashboard-card";
import { Metric } from "../catalog/metric";
import { DataTable } from "../catalog/data-table";
import { TerminologySelect } from "../catalog/terminology-select";
import { RepeatableGroup } from "../catalog/repeatable-group";
import { DataSelect } from "../catalog/data-select";
import { DynamicSelect } from "../catalog/dynamic-select";
import { SlotPicker } from "../catalog/slot-picker";
import { FileUpload } from "../catalog/FileUpload";

export type ComponentConfig = {
  component: React.ComponentType<any>;
};

export type Catalog = {
  [key: string]: ComponentConfig;
};

export const DEFAULT_CATALOG: Catalog = {
  Text: { component: Text },
  Row: { component: Row },
  Column: { component: Column },
  Image: { component: Image },
  Icon: { component: Icon },
  Button: { component: Button },
  Card: { component: Card },
  Tabs: { component: Tabs },
  Modal: { component: Modal },
  CheckBox: { component: Checkbox },
  TextField: { component: TextField },
  DateTimeInput: { component: DateTimeInput },
  DatePicker: { component: DatePicker },
  Slider: { component: Slider },
  MultipleChoice: { component: MultipleChoice },
  List: { component: List },
  Divider: { component: Divider },
  Video: { component: Video },
  AudioPlayer: { component: AudioPlayer },
  Table: { component: Table },
  Form: { component: Form },
  Switch: { component: Switch },
  RadioGroup: { component: RadioGroup },
  Badge: { component: Badge },
  Avatar: { component: Avatar },
  Alert: { component: Alert },
  Progress: { component: Progress },
  Spinner: { component: Spinner },
  Accordion: { component: Accordion },
  Breadcrumb: { component: Breadcrumb },
  SearchField: { component: SearchField },
  Link: { component: Link },
  Separator: { component: Separator },
  Markdown: { component: Markdown },
  BarChart: { component: BarChart },
  LineChart: { component: LineChart },
  AreaChart: { component: AreaChart },
  PieChart: { component: PieChart },
  DashboardCard: { component: DashboardCard },
  Metric: { component: Metric },
  DataTable: { component: DataTable },
  TerminologySelect: { component: TerminologySelect },
  RepeatableGroup: { component: RepeatableGroup },
  DataSelect: { component: DataSelect },
  DynamicSelect: { component: DynamicSelect },
  SlotPicker: { component: SlotPicker },
  FileUpload: { component: FileUpload },
};
