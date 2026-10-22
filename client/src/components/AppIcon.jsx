import {
    Activity,
    ArrowUp,
    ArrowUpRight,
    BadgeCheck,
    BarChart3,
    BookOpen,
    Building2,
    CalendarDays,
    Check,
    Circle,
    CircleAlert,
    CircleCheck,
    ClipboardList,
    Files,
    FilePlus,
    FileText,
    FolderOpen,
    Fingerprint,
    GraduationCap,
    Headphones,
    Hourglass,
    Info,
    Landmark,
    LayoutDashboard,
    LifeBuoy,
    Lightbulb,
    LoaderCircle,
    LockKeyhole,
    LogOut,
    Mail,
    MapPin,
    Paperclip,
    RefreshCw,
    ScrollText,
    Search,
    Settings2,
    Tag,
    Tags,
    Type,
    UploadCloud,
    UserCheck,
    UserRound,
    UserRoundPlus,
    Users
} from 'lucide-react';

const SIZES = { sm: 16, md: 18, lg: 20, xl: 24 };

const ICON_MAP = {
    dashboard: LayoutDashboard,
    'file-plus': FilePlus,
    files: Files,
    activity: Activity,
    user: UserRound,
    'life-buoy': LifeBuoy,
    search: Search,
    users: Users,
    'user-plus': UserRoundPlus,
    upload: UploadCloud,
    building: Building2,
    tags: Tags,
    tag: Tag,
    'scroll-text': ScrollText,
    settings: Settings2,
    logout: LogOut,
    lock: LockKeyhole,
    mail: Mail,
    landmark: Landmark,
    paperclip: Paperclip,
    'upload-cloud': UploadCloud,
    calendar: CalendarDays,
    priority: BarChart3,
    'arrow-up-right': ArrowUpRight,
    'circle-check': CircleCheck,
    'circle-alert': CircleAlert,
    loader: LoaderCircle,
    'graduation-cap': GraduationCap,
    book: BookOpen,
    type: Type,
    'user-check': UserCheck,
    'badge-check': BadgeCheck,
    fingerprint: Fingerprint,
    university: Landmark,
    'file-text': FileText,
    'map-pin': MapPin,
    info: Info,
    lightbulb: Lightbulb,
    headphones: Headphones,
    check: Check,
    circle: Circle,
    'clipboard-list': ClipboardList,
    folder: FolderOpen,
    'arrow-up': ArrowUp,
    hourglass: Hourglass,
    refresh: RefreshCw,
    'clipboard': ClipboardList
};

export function AppIcon({ name, size = 'md', className = '', ...props }) {
    const px = typeof size === 'number' ? size : SIZES[size] || 18;
    const Icon = ICON_MAP[name];
    if (!Icon) return null;
    return (
        <Icon
            size={px}
            strokeWidth={1.75}
            className={`icon-inline ${className}`.trim()}
            aria-hidden={props['aria-hidden'] ?? true}
            {...props}
        />
    );
}

export function ProfileFieldIcon({ name }) {
    return <AppIcon name={name} size="md" />;
}
