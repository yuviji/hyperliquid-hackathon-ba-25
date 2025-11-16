import React from 'react';
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  Calendar, 
  Package, 
  Loader, 
  Check, 
  XCircle 
} from 'lucide-react';

const statusConfig = {
  'parsed': {
    label: 'Parsed',
    icon: FileText,
    className: 'badge-parsed'
  },
  'pending-approval': {
    label: 'Pending Approval',
    icon: Clock,
    className: 'badge-pending-approval'
  },
  'approved': {
    label: 'Approved',
    icon: CheckCircle,
    className: 'badge-approved'
  },
  'scheduled': {
    label: 'Scheduled',
    icon: Calendar,
    className: 'badge-scheduled'
  },
  'queued': {
    label: 'Queued',
    icon: Package,
    className: 'badge-queued'
  },
  'executing': {
    label: 'Executing',
    icon: Loader,
    className: 'badge-executing'
  },
  'executed': {
    label: 'Executed',
    icon: Check,
    className: 'badge-executed'
  },
  'failed': {
    label: 'Failed',
    icon: XCircle,
    className: 'badge-failed'
  }
};

function StatusBadge({ status }) {
  const config = statusConfig[status] || statusConfig['parsed'];
  const Icon = config.icon;

  return (
    <span className={`badge ${config.className}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

export default StatusBadge;
