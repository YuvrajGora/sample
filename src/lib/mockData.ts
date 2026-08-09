export type BinInfo = {
  binId: string;
  address: string;
  zone: string;
  capacity: string;
  lastCollected: string;
};

export const binRegistry: BinInfo[] = [
  { binId: 'BIN-112', address: 'MG Road, Sector 4 — near bus stop', zone: 'Ward 15 — Central', capacity: '240 L', lastCollected: 'Today, 06:45 AM' },
  { binId: 'BIN-204', address: 'Riverside Park, Gate 2 — children play area', zone: 'Ward 12 — Riverside', capacity: '360 L', lastCollected: 'Yesterday, 07:15 AM' },
  { binId: 'BIN-318', address: 'Lake View Apartments — Block B entrance', zone: 'Ward 4 — Lake View', capacity: '240 L', lastCollected: 'Today, 07:42 AM' },
  { binId: 'BIN-425', address: 'Central Market, Stall 22 — vegetable section', zone: 'Ward 15 — Central', capacity: '480 L', lastCollected: 'Yesterday, 09:40 AM' },
  { binId: 'BIN-507', address: 'Green Valley Lane, House 8 — street corner', zone: 'Ward 9 — Green Valley', capacity: '240 L', lastCollected: 'Today, 08:05 AM' },
  { binId: 'BIN-612', address: 'Industrial Area, Plot 14 — rear gate', zone: 'Ward 8 — Industrial', capacity: '660 L', lastCollected: '2 days ago, 10:20 AM' },
  { binId: 'BIN-701', address: 'Sector 7 Community Bin — main square', zone: 'Ward 7 — Sector 7', capacity: '360 L', lastCollected: 'Yesterday, 09:12 AM' },
];

export function lookupBin(rawScan: string): BinInfo {
  const normalized = rawScan.trim().toUpperCase();
  const found = binRegistry.find(
    (b) => b.binId.toUpperCase() === normalized || normalized.includes(b.binId.toUpperCase()),
  );
  if (found) return found;
  return {
    binId: normalized || 'UNKNOWN',
    address: 'Location not registered — please report the address manually',
    zone: 'Unregistered',
    capacity: '—',
    lastCollected: '—',
  };
}

export type Complaint = {
  id: string;
  type: string;
  location: string;
  priority: 'Low' | 'Medium' | 'High';
  status: 'Pending' | 'In Progress' | 'Assigned' | 'Resolved';
  reportedAt: string;
  overflow: number;
  wasteType: string;
  assignedTo?: string;
  summary: string;
};

export const complaints: Complaint[] = [
  {
    id: 'CMP-4821', type: 'Overflow Bin', location: 'MG Road, Sector 4',
    priority: 'High', status: 'Pending', reportedAt: '2026-08-02 09:12',
    overflow: 92, wasteType: 'Mixed Municipal Waste',
    summary: 'Public bin near MG Road bus stop overflowing with mixed waste. Strong odour reported by 3 residents. Requires immediate collection.',
  },
  {
    id: 'CMP-4818', type: 'Missed Pickup', location: 'Riverside Park, Gate 2',
    priority: 'Medium', status: 'Assigned', reportedAt: '2026-08-02 08:40',
    overflow: 65, wasteType: 'Organic Waste',
    assignedTo: 'Ravi Kumar (SW-2041)',
    summary: 'Scheduled morning pickup at Riverside Park missed. Organic waste accumulating near children play area.',
  },
  {
    id: 'CMP-4810', type: 'Illegal Dumping', location: 'Industrial Area, Plot 14',
    priority: 'High', status: 'In Progress', reportedAt: '2026-08-01 18:22',
    overflow: 78, wasteType: 'Construction Debris',
    assignedTo: 'Mohan Das (SW-2033)',
    summary: 'Construction debris illegally dumped behind Plot 14. Estimated 2 truckloads. Needs dedicated clearance team.',
  },
  {
    id: 'CMP-4805', type: 'Damaged Bin', location: 'Lake View Apartments',
    priority: 'Low', status: 'Resolved', reportedAt: '2026-08-01 14:05',
    overflow: 30, wasteType: 'Recyclable Plastic',
    assignedTo: 'Sneha Reddy (SW-2055)',
    summary: 'Recycling bin lid broken at Lake View Apartments. Bin replaced and collection resumed.',
  },
  {
    id: 'CMP-4798', type: 'Overflow Bin', location: 'Central Market, Stall 22',
    priority: 'Medium', status: 'Pending', reportedAt: '2026-08-01 11:30',
    overflow: 71, wasteType: 'Organic Waste',
    summary: 'Vegetable market stall bin overflowing with organic waste. Attracting pests. Needs daily collection review.',
  },
  {
    id: 'CMP-4790', type: 'Missed Pickup', location: 'Green Valley Lane, House 8',
    priority: 'Low', status: 'Resolved', reportedAt: '2026-07-31 19:50',
    overflow: 45, wasteType: 'Mixed Municipal Waste',
    assignedTo: 'Ravi Kumar (SW-2041)',
    summary: 'Residential pickup delayed by 1 day. Collection completed and schedule adjusted.',
  },
];

export type Worker = {
  name: string;
  id: string;
  zone: string;
  status: 'Online' | 'Offline';
  collectionsToday: number;
  target: number;
  rating: number;
  avatar: string;
};

export const workers: Worker[] = [
  { name: 'Ravi Kumar', id: 'SW-2041', zone: 'Ward 12 — Riverside', status: 'Online', collectionsToday: 38, target: 45, rating: 4.8, avatar: 'RK' },
  { name: 'Mohan Das', id: 'SW-2033', zone: 'Ward 8 — Industrial', status: 'Online', collectionsToday: 22, target: 40, rating: 4.5, avatar: 'MD' },
  { name: 'Sneha Reddy', id: 'SW-2055', zone: 'Ward 4 — Lake View', status: 'Online', collectionsToday: 41, target: 42, rating: 4.9, avatar: 'SR' },
  { name: 'Arjun Mehta', id: 'SW-2067', zone: 'Ward 15 — Central', status: 'Offline', collectionsToday: 0, target: 38, rating: 4.3, avatar: 'AM' },
  { name: 'Fatima Sheikh', id: 'SW-2088', zone: 'Ward 9 — Green Valley', status: 'Online', collectionsToday: 35, target: 44, rating: 4.7, avatar: 'FS' },
];

export type RouteStop = {
  id: string;
  address: string;
  status: 'Completed' | 'Pending' | 'Missed';
  time: string;
  distance: string;
  wasteType: string;
};

export const routeStops: RouteStop[] = [
  { id: 'R-01', address: '12 Riverside Park, Gate 2', status: 'Completed', time: '07:15', distance: '0.4 km', wasteType: 'Organic' },
  { id: 'R-02', address: '8 Lake View Apartments', status: 'Completed', time: '07:42', distance: '0.9 km', wasteType: 'Recyclable' },
  { id: 'R-03', address: '24 Green Valley Lane', status: 'Completed', time: '08:05', distance: '1.6 km', wasteType: 'Mixed' },
  { id: 'R-04', address: 'MG Road, Sector 4 (Bin #112)', status: 'Pending', time: '08:30', distance: '2.1 km', wasteType: 'Mixed' },
  { id: 'R-05', address: 'Central Market, Stall 22', status: 'Pending', time: '09:00', distance: '2.8 km', wasteType: 'Organic' },
  { id: 'R-06', address: 'Industrial Area, Plot 14', status: 'Pending', time: '09:35', distance: '4.2 km', wasteType: 'Debris' },
  { id: 'R-07', address: 'Sector 7 Community Bin', status: 'Pending', time: '10:10', distance: '5.0 km', wasteType: 'Mixed' },
];

export const collectionHistory = [
  { id: 'C-9921', location: '12 Riverside Park', date: '2026-08-01', time: '07:18', status: 'Completed', wasteType: 'Organic' },
  { id: 'C-9918', location: '8 Lake View Apartments', date: '2026-08-01', time: '07:45', status: 'Completed', wasteType: 'Recyclable' },
  { id: 'C-9914', location: '24 Green Valley Lane', date: '2026-08-01', time: '08:08', status: 'Completed', wasteType: 'Mixed' },
  { id: 'C-9907', location: 'Sector 7 Community Bin', date: '2026-07-31', time: '09:12', status: 'Completed', wasteType: 'Mixed' },
  { id: 'C-9901', location: 'Central Market', date: '2026-07-31', time: '09:40', status: 'Completed', wasteType: 'Organic' },
];

export const recentActivity = [
  { icon: 'check', title: 'Collection completed at Riverside Park', time: '2 hours ago', accent: 'emerald' },
  { icon: 'star', title: 'Earned 15 Green Points for recycling', time: '5 hours ago', accent: 'amber' },
  { icon: 'alert', title: 'Complaint CMP-4805 resolved', time: 'Yesterday', accent: 'blue' },
  { icon: 'leaf', title: 'Weekly recycling streak: 12 days', time: 'Yesterday', accent: 'emerald' },
];

export const notifications = [
  { id: 1, title: 'Pickup scheduled tomorrow', body: 'Your next collection is at 7:30 AM, Zone 4.', time: '1h ago', read: false, icon: 'truck' },
  { id: 2, title: 'Complaint resolved', body: 'CMP-4805 — Bin replaced at Lake View.', time: '3h ago', read: false, icon: 'check' },
  { id: 3, title: 'Green Points earned', body: 'You earned 15 points for recycling.', time: '5h ago', read: true, icon: 'star' },
  { id: 4, title: 'New recycling tip', body: 'Rinse plastics before disposal to boost recycling quality.', time: '1d ago', read: true, icon: 'leaf' },
];

// ===== Analytics data =====
export const weeklyCollections = [
  { day: 'Mon', collections: 320, complaints: 12 },
  { day: 'Tue', collections: 295, complaints: 9 },
  { day: 'Wed', collections: 340, complaints: 15 },
  { day: 'Thu', collections: 310, complaints: 8 },
  { day: 'Fri', collections: 365, complaints: 18 },
  { day: 'Sat', collections: 280, complaints: 6 },
  { day: 'Sun', collections: 190, complaints: 4 },
];

export const wasteTypeBreakdown = [
  { name: 'Organic', value: 42, color: '#10b981' },
  { name: 'Recyclable', value: 28, color: '#3b82f6' },
  { name: 'Mixed', value: 22, color: '#f59e0b' },
  { name: 'Hazardous', value: 8, color: '#ef4444' },
];

export const zoneHeatmap = [
  { zone: 'Ward 4 — Lake View', level: 92, collections: 48 },
  { zone: 'Ward 8 — Industrial', level: 78, collections: 35 },
  { zone: 'Ward 9 — Green Valley', level: 64, collections: 40 },
  { zone: 'Ward 12 — Riverside', level: 55, collections: 38 },
  { zone: 'Ward 15 — Central', level: 41, collections: 22 },
  { zone: 'Ward 7 — Sector 7', level: 33, collections: 18 },
];

export const aiInsights = [
  {
    icon: 'trend',
    title: 'Collection efficiency up 12%',
    body: 'AI route optimization reduced average collection time from 4.2 to 3.7 minutes per stop this week.',
    accent: 'emerald',
  },
  {
    icon: 'alert',
    title: 'Overflow spike predicted — Central Market',
    body: 'Model predicts 78% overflow probability at Central Market by Saturday. Recommend adding a second daily pickup.',
    accent: 'amber',
  },
  {
    icon: 'zap',
    title: 'Worker Ravi Kumar top performer',
    body: '96% completion rate with 4.8 citizen rating. Suggested for high-density ward reassignment.',
    accent: 'blue',
  },
];

export const citizenStats = {
  greenPoints: 1240,
  rank: 'Gold Tier',
  reportsFiled: 7,
  recyclingStreak: 12,
  nextPickup: 'Tomorrow, 7:30 AM',
  pickupZone: 'Zone 4 — Riverside',
  todayStatus: 'Scheduled',
  housesOnRoute: 48,
};
