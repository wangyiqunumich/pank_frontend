'use client'
 
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import './scoped.css'; // This is where you will import your CSS from
import logo_l from '../Image/Logo.svg'
 
function NavBarWhite() {
  const pathname = usePathname()
 
  return (
    // <nav>
    //   <Link className={`link ${pathname === '/' ? 'active' : ''}`} href="/">
    //     Home
    //   </Link>
 
    //   <Link
    //     className={`link ${pathname === '/about' ? 'active' : ''}`}
    //     href="/about"
    //   >
    //     About
    //   </Link>
    // </nav>
    <nav className="navigation-bar">
        <div className="logo" >
            <Link className={`link ${pathname === '/' ? 'active' : ''}`} href="/">
                {/* <img src={logo_l} alt="Logo" style={{width: '80px', height: 'auto'}}/> */}
                PanKGraph Logo
            </Link>
            {/* <a>Genomic Literature Knowledge Base</a> */}
        </div>
        <div className="nav-links">
            {/* These links will be aligned to the right */}
            <a href="/" target="_blank" >Knowledge</a>
            <a href="/" target="_blank" >Catalog</a>
            <a href="/" target="_blank" >PanKGraph</a>
            <a href="/" target="_blank" >Compute</a>
            <a href="/" target="_blank" >Info</a>
            <a href="/" target="_blank" >Help</a>
        </div>
    </nav>
  )
}

export default NavBarWhite;