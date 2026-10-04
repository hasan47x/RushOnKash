import { UserPlus, CreditCard, AlertCircle, CheckCircle, XCircle, Clock } from 'lucide-react';
import { formatCurrency } from '../../shared/utils/cn';

interface ActivityItem {
  type: 'user' | 'withdrawal' | 'game';
  title: string;
  description: string;
  time: string;
  status?: 'pending' | 'completed' | 'failed';
  amount?: number;
}

const mockActivities: ActivityItem[] = [
  { type: 'user', title: 'New User Registered', description: 'John Doe (@johndoe)', time: '2 min ago' },
  { type: 'withdrawal', title: 'Withdrawal Request', description: 'Jane Smith - bKash', time: '5 min ago', status: 'pending', amount: 500 },
  { type: 'user', title: 'New User Registered', description: 'Alice Wilson (@alicew)', time: '12 min ago' },
  { type: 'withdrawal', title: 'Withdrawal Approved', description: 'Bob Johnson - Nagad', time: '18 min ago', status: 'completed', amount: 1200 },
  { type: 'game', title: 'CoinFlip Win', description: 'Mike Brown won CoinFlip', time: '25 min ago' },
  { type: 'withdrawal', title: 'Withdrawal Rejected', description: 'Sarah Davis - Insufficient refs', time: '32 min ago', status: 'failed', amount: 300 },
  { type: 'user', title: 'New User Registered', description: 'Tom Wilson (@tomw)', time: '40 min ago' },
  { type: 'game', title: 'Spin Wheel Win', description: 'Lisa Chen won ৳0.10', time: '48 min ago' },
];

export function RecentActivity() {
  return (
    <div className="card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Recent Activity</h3>
        <a href="/users" className="text-sm text-primary-500 hover:text-primary-400">View All</a>
      </div>
      <div className="space-y-3">
        {mockActivities.map((activity, index) => (
          <div key={index} className="flex items-center gap-3 p-3 bg-dark-800/50 rounded-lg">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center">
              {activity.type === 'user' && <UserPlus className="w-5 h-5 text-green-500" />}
              {activity.type === 'withdrawal' && <CreditCard className="w-5 h-5 text-yellow-500" />}
              {activity.type === 'game' && <Gamepad2 className="w-5 h-5 text-purple-500" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{activity.title}</p>
              <p className="text-xs text-dark-400 truncate">{activity.description}</p>
            </div>
            <div className="flex items-center gap-2 text-right">
              {activity.amount && (
                <span className="text-sm font-semibold text-green-500">+{activity.amount > 0 ? formatCurrency(activity.amount) : formatCurrency(activity.amount)}</span>
              )}
              {activity.status === 'pending' && <span className="badge-warning text-xs">Pending</span>}
              {activity.status === 'completed' && <span className="badge-success text-xs">Completed</span>}
              {activity.status === 'failed' && <span className="badge-danger text-xs">Failed</span>}
              <span className="text-xs text-dark-500">{activity.time}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

import { Gamepad2 } from 'lucide-react';