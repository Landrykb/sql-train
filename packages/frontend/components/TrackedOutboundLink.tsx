'use client';
import { track, Events } from '@/lib/analytics';

export default function TrackedOutboundLink({ network, href, className, style, children }: {
  network: string; href: string; className?: string; style?: React.CSSProperties; children: React.ReactNode;
}) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className} style={style}
       onClick={() => track(Events.LINKS_SOCIAL_CLICKED, { network })}>
      {children}
    </a>
  );
}
