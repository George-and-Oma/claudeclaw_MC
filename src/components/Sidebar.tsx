'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useMobileLayout } from './MobileLayout';

const navItems = [
  { icon: '💬', label: 'Chat', href: '/chat' },
  { icon: '☑️', label: 'Tasks', href: '/' },
  { icon: '🤖', label: 'Agents', href: '/agents' },
  { icon: '📄', label: 'Content', href: '#' },
  { icon: '✅', label: 'Approvals', href: '#' },
  { icon: '👥', label: 'Council', href: '#' },
  { icon: '📅', label: 'Calendar', href: '/calendar' },
  { icon: '📁', label: 'Projects', href: '/projects' },
  { icon: '🧠', label: 'Memory', href: '/memory' },
  { icon: '📚', label: 'Docs', href: '/docs' },
  { icon: '👤', label: 'People', href: '#' },
  { icon: '🏢', label: 'Office', href: '#' },
  { icon: '👨‍👩‍👧‍👦', label: 'Team', href: '/team' },
  { icon: '⚙️', label: 'System', href: '#' },
  { icon: '📡', label: 'Radar', href: '#' },
  { icon: '🏭', label: 'Factory', href: '#' },
  { icon: '🔄', label: 'Pipeline', href: '#' },
  { icon: '📣', label: 'Feedback', href: '#' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, setSidebarOpen } = useMobileLayout();

  const handleNavClick = (href: string, e: React.MouseEvent) => {
    if (href === '#') {
      e.preventDefault();
      return;
    }
    // Close sidebar on mobile after navigation
    setSidebarOpen(false);
  };

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed md:static inset-y-0 left-0 z-50
          w-56 md:w-48 h-screen bg-[#0d0d0d] border-r border-[#2a2a2a] flex flex-col
          transform transition-transform duration-300 ease-in-out
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* Logo - add safe area padding for iOS notch */}
        <div className="p-4 pt-[max(1rem,env(safe-area-inset-top))] flex items-center justify-between border-b border-[#2a2a2a]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-purple-600 rounded flex items-center justify-center text-xs">
              ⚡
            </div>
            <span className="font-semibold text-white">Mission Control</span>
          </div>
          {/* Close button on mobile */}
          <button
            className="md:hidden p-1 text-[#666] hover:text-white"
            onClick={() => setSidebarOpen(false)}
          >
            ✕
          </button>
        </div>

        {/* Nav Items */}
        <nav className="flex-1 overflow-y-auto py-2">
          {navItems.map((item) => {
            const isActive = item.href === '/'
              ? pathname === '/'
              : pathname.startsWith(item.href) && item.href !== '#';

            return (
              <Link
                key={item.label}
                href={item.href}
                className={`w-full flex items-center gap-3 px-4 py-2.5 md:py-2 text-sm transition-colors ${
                  isActive
                    ? 'bg-[#1f1f1f] text-white'
                    : item.href === '#'
                    ? 'text-[#666] cursor-not-allowed'
                    : 'text-[#a0a0a0] hover:bg-[#161616] hover:text-white'
                }`}
                onClick={(e) => handleNavClick(item.href, e)}
              >
                <span className="text-base">{item.icon}</span>
                <span>{item.label}</span>
                {item.href === '#' && (
                  <span className="text-[10px] text-[#444] ml-auto">soon</span>
                )}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
