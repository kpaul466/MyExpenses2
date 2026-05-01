import React from 'react';
import * as Icons from 'lucide-react';
import { LucideProps } from 'lucide-react';

interface IconRendererProps extends LucideProps {
  name: string;
  size?: string | number;
}

export const IconRenderer: React.FC<IconRendererProps> = ({ name, ...props }) => {
  const IconComponent = (Icons as any)[name];
  if (!IconComponent) return <Icons.HelpCircle {...props} />;
  return <IconComponent {...props} />;
};

export const AVAILABLE_ICONS = [
  // Finance & Shopping
  'Banknote', 'Coins', 'CreditCard', 'Wallet', 'ShoppingBag', 'ShoppingCart', 'Tag', 'Receipt', 'TrendingUp', 'PiggyBank',
  // Food & Drink
  'Coffee', 'Utensils', 'Pizza', 'Beer', 'Wine', 'IceCream', 'Croissant',
  // Travel & Transport
  'Car', 'Plane', 'TrainFront', 'Bike', 'Bus', 'Fuel', 'MapPin', 'Hotel',
  // Home & Utilities
  'Home', 'Zap', 'Droplets', 'Flame', 'Wifi', 'Tv', 'Trash2', 'Wrench',
  // Health & Wellness
  'HeartPulse', 'Dumbbell', 'Stethoscope', 'Pills', 'Baby', 'Dog', 'Cat',
  // Education & Work
  'GraduationCap', 'Book', 'Briefcase', 'Laptop', 'PenTool', 'Monitor',
  // Entertainment & Leisure
  'Gamepad2', 'Music', 'Camera', 'Ticket', 'Theater', 'Trophy', 'Ghost',
  // Others
  'Gift', 'Umbrella', 'Scissors', 'Shield', 'Globe', 'Bell', 'Cloud', 'Smile'
];
