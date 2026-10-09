import './scoped.css';
import React, { useEffect } from 'react';
import HandymanOutlinedIcon from '@mui/icons-material/HandymanOutlined';

export default function MaintenancePage() {
  useEffect(() => {
    const originalTitle = document.title;
    document.title = 'Maintenance | PanKgraph';
    const existingRobots = document.querySelector('meta[name="robots"]');
    const robots = existingRobots || document.createElement('meta');
    const originalRobots = robots.getAttribute('content');
    robots.setAttribute('name', 'robots');
    robots.setAttribute('content', 'noindex, nofollow');
    if (!existingRobots) document.head.appendChild(robots);
    return () => {
      document.title = originalTitle;
      if (!existingRobots) robots.remove();
      else if (originalRobots === null) robots.removeAttribute('content');
      else robots.setAttribute('content', originalRobots);
    };
  }, []);

  return (
    <div className="pk-maintenance-page">
      <main className="pk-maintenance-main" aria-labelledby="pk-maintenance-title">
        <HandymanOutlinedIcon className="pk-maintenance-icon" aria-hidden="true" />
        <h1 id="pk-maintenance-title" className="pk-maintenance-title">PanKgraph is under maintenance.</h1>
        <p className="pk-maintenance-subtitle">
          We&apos;ll be back before <time dateTime="2026-10-14">October 14</time>.
        </p>
        <p className="pk-maintenance-note">Thank you for your patience. Please check back soon.</p>
        <a href="mailto:wyq@umich.edu, runbomao@umich.edu, drjieliu@umich.edu, fan.feng@vumc.org, help@pankbase.org" className="pk-maintenance-contact">Contact us</a>
      </main>
    </div>
  );
}
