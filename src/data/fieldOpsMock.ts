export type FieldRole = 'STAFF_DELIVERY' | 'LEADER';

export const fieldAccounts = {
  STAFF_DELIVERY: { name: 'Hoàng Văn Tuấn', email: 'delivery.mock@trekgo.vn', label: 'Staff Delivery' },
  LEADER: { name: 'Minh Khoa', email: 'leader.mock@trekgo.vn', label: 'Mountain Leader', canCreatePublicTrip: true },
} as const;

export interface DeliveryTask {
  id: string;
  type: 'GIAO_THIET_BI' | 'THU_HOI';
  title: string;
  customer: string;
  location: string;
  time: string;
  status: string;
  items: string;
}

export const deliveryTasks: DeliveryTask[] = [];

export const emptyDeliveryTask: DeliveryTask = {
  id: '',
  type: 'GIAO_THIET_BI',
  title: '',
  customer: '',
  location: '',
  time: '',
  status: '',
  items: '',
};

export const leaderTrip = {
  name: '',
  code: '',
  date: '',
  status: '',
  members: 0,
  checkedIn: 0,
  nextCheckpoint: '',
  altitude: '',
};

export interface LeaderMember {
  name: string;
  role: string;
  status: string;
}

export const leaderMembers: LeaderMember[] = [];