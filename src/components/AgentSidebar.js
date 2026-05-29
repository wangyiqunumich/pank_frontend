import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import { useAuth } from 'react-oidc-context';
import {
  useLocation,
  useNavigate,
} from 'react-router-dom';

import AddIcon from '@mui/icons-material/Add';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import PersonOutlineOutlinedIcon
  from '@mui/icons-material/PersonOutlineOutlined';
import {
  Avatar,
  Box,
  Button,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Tooltip,
  Typography,
} from '@mui/material';

import { ReactComponent as SidebarLeftIcon } from '../image/sidebar.left.svg';
import { readRecentChats } from '../utils/chatSessionStorage';

const utf8ToBase64 = (str) => btoa(unescape(encodeURIComponent(str)));
const SIDEBAR_EXPANDED_WIDTH = 264;
const SIDEBAR_COLLAPSED_WIDTH = 80;
const SIDEBAR_HOVER_BG = '#E3F0F1';
const SIDEBAR_ACTIVE_BG = '#D9EAEB';
const SHOW_SIDEBAR_SIGN_IN = false;

function SidebarButton({ active, icon, label, onClick, open }) {
  const button = (
    <Button
      disableElevation
      onClick={onClick}
      sx={{
        minWidth: 0,
        justifyContent: open ? 'flex-start' : 'center',
        borderRadius: open ? '20px' : '50%',
        bgcolor: open && active ? SIDEBAR_ACTIVE_BG : 'transparent',
        color: active ? '#3A838B' : '#7D7D7D',
        fontFamily: 'DM Sans, Inter, sans-serif',
        fontSize: 14,
        fontWeight: 600,
        textTransform: 'none',
        height: 40,
        px: open ? 1.25 : 0,
        width: open ? '100%' : 40,
        '&:hover': { bgcolor: open ? SIDEBAR_HOVER_BG : (active ? SIDEBAR_ACTIVE_BG : 'transparent') },
        '&:hover .sidebar-icon-bubble': { bgcolor: open ? 'transparent' : (active ? SIDEBAR_ACTIVE_BG : SIDEBAR_HOVER_BG) },
        transition: 'width 220ms ease, padding 220ms ease, border-radius 220ms ease, justify-content 220ms ease',
      }}
    >
      <Box
        className="sidebar-icon-bubble"
        sx={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'inherit',
          flexShrink: 0,
          bgcolor: open ? 'transparent' : (active ? SIDEBAR_ACTIVE_BG : 'transparent'),
          transition: 'background-color 150ms ease',
        }}
      >
        {icon}
      </Box>
      <Box
        component="span"
        sx={{
          ml: open ? 1.1 : 0,
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          maxWidth: open ? 160 : 0,
          opacity: open ? 1 : 0,
          transition: 'max-width 200ms ease, opacity 150ms ease',
        }}
      >
        {label}
      </Box>
    </Button>
  );

  if (open) return button;

  return (
    <Tooltip title={label} placement="right" arrow>
      <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%' }}>{button}</Box>
    </Tooltip>
  );
}

export default function AgentSidebar({ activeNav = 'new-chat', forceFullHeight: _forceFullHeight = false }) {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useAuth();
  const [recentChats, setRecentChats] = useState([]);
  const [userMenuAnchorEl, setUserMenuAnchorEl] = useState(null);
  const [open, setOpen] = useState(() => {
    if (typeof window === 'undefined') return true;
    const stored = window.localStorage.getItem('pank-sidebar-open');
    if (stored === null) return true;
    return stored === 'true';
  });

  useEffect(() => {
    setRecentChats(readRecentChats());
  }, [location.pathname, location.search]);

  useEffect(() => {
    const refreshRecentChats = () => {
      setRecentChats(readRecentChats());
    };

    window.addEventListener('pank-recent-chats-updated', refreshRecentChats);
    return () => {
      window.removeEventListener('pank-recent-chats-updated', refreshRecentChats);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('pank-sidebar-open', String(open));
    window.dispatchEvent(new CustomEvent('pank-sidebar-toggle', { detail: { open } }));
  }, [open]);

  const isUserMenuOpen = Boolean(userMenuAnchorEl);
  const currentSessionId = useMemo(() => {
    const params = new URLSearchParams(location.search || '');
    return String(params.get('session_id') || '').trim();
  }, [location.search]);
  const hasActiveRecentChat = useMemo(
    () => Boolean(currentSessionId && recentChats.some((chat) => String(chat?.sessionId || '') === currentSessionId)),
    [currentSessionId, recentChats]
  );
  const isNewChatActive = activeNav === 'new-chat' && !hasActiveRecentChat;
  const userProfile = auth?.user?.profile || {};
  const userDisplayName = userProfile?.email || userProfile?.name || userProfile?.preferred_username || 'Account';
  const isAuthenticated = Boolean(auth?.isAuthenticated);
  const accountIcon = isAuthenticated ? (
    <Avatar sx={{ width: 24, height: 24, bgcolor: '#DDF4F0', color: '#006766', fontSize: 12, fontWeight: 700 }}>
      {String(userDisplayName || 'A').charAt(0).toUpperCase()}
    </Avatar>
  ) : (
    <PersonOutlineOutlinedIcon sx={{ color: '#5A6161' }} />
  );

  const handleOpenUserMenu = (event) => {
    setUserMenuAnchorEl(event.currentTarget);
  };

  const handleCloseUserMenu = () => {
    setUserMenuAnchorEl(null);
  };

  const handleCognitoLogin = () => {
    handleCloseUserMenu();
    const returnTo = `${location.pathname}${location.search}${location.hash}`;
    auth.signinRedirect({ state: { returnTo } });
  };

  const handleCognitoLogout = () => {
    handleCloseUserMenu();
    const clientId = process.env.REACT_APP_COGNITO_CLIENT_ID || '7anmab22h1r3968o5tinp682kj';
    const runtimeOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://pankgraph.org';
    const logoutUri = process.env.REACT_APP_COGNITO_LOGOUT_URI || runtimeOrigin;
    const cognitoDomain = process.env.REACT_APP_COGNITO_DOMAIN || 'https://us-east-1yuekwjivn.auth.us-east-1.amazoncognito.com';

    auth.removeUser();
    window.location.href = `${cognitoDomain}/logout?client_id=${clientId}&logout_uri=${encodeURIComponent(logoutUri)}`;
  };

  return (
    <Box
      sx={{
        position: 'relative',
        zIndex: 1100,
        alignSelf: 'stretch',
        width: open ? SIDEBAR_EXPANDED_WIDTH : SIDEBAR_COLLAPSED_WIDTH,
        minWidth: open ? SIDEBAR_EXPANDED_WIDTH : SIDEBAR_COLLAPSED_WIDTH,
        bgcolor: '#F8FBFC',
        borderRight: '1px solid #E2E8F0',
        px: open ? 2 : 1,
        display: 'none',
        '@media (min-width:1000px)': {
          display: 'flex',
        },
        flexDirection: 'column',
        boxSizing: 'border-box',
        transition: 'width 220ms ease, min-width 220ms ease, padding 220ms ease',
      }}
    >
      <Box sx={{ position: 'sticky', top: 0, pt: open ? 4.5 : 4, pb: 1, bgcolor: '#F8FBFC', zIndex: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: open ? 'space-between' : 'center', mb: 2 }}>
          {open ? (
            <Typography
              onClick={() => navigate('/')}
              sx={{
                fontFamily: 'Archivo, DM Sans, Inter, sans-serif',
                fontWeight: 600,
                fontSize: 22,
                color: '#3A838B',
                cursor: 'pointer',
              }}
            >
              PanKgraph
            </Typography>
          ) : null}
          <Tooltip title={open ? 'Collapse sidebar' : 'Expand sidebar'} placement="right" arrow>
            <IconButton
              onClick={() => setOpen((v) => !v)}
              size="small"
              sx={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                color: '#7D7D7D',
                bgcolor: 'transparent',
                border: 'none',
                '&:hover': { bgcolor: SIDEBAR_HOVER_BG },
              }}
            >
              <SidebarLeftIcon
                style={{
                  width: 18,
                  height: 14,
                }}
              />
            </IconButton>
          </Tooltip>
        </Box>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
          <SidebarButton
            active={isNewChatActive}
            open={open}
            icon={<AddIcon />}
            label="New Chat"
            onClick={() => navigate('/')}
          />
          <SidebarButton
            active={activeNav === 'skills'}
            open={open}
            icon={<AssignmentOutlinedIcon />}
            label="Tools"
            onClick={() => navigate('/skills')}
          />
          {open && (
            <Typography
              sx={{
                mt: 0.5,
                px: 1,
                color: '#8B949E',
                fontFamily: 'DM Sans, Inter, sans-serif',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                textAlign: 'left',
                lineHeight: '18px',
              }}
            >
              Recent
            </Typography>
          )}

          {open && (
            <Box
              sx={{
                mt: 0.5,
                display: 'flex',
                flexDirection: 'column',
                gap: 0.5,
                maxHeight: '42vh',
                overflowY: 'auto',
                pr: 0.5,
              }}
            >
              {recentChats.length > 0 ? recentChats.map((chat) => {
                const encodedQuestion = encodeURIComponent(utf8ToBase64(chat.firstQuestion || ''));
                const target = `/result-new2?question=${encodedQuestion}&session_id=${encodeURIComponent(chat.sessionId)}`;
                const isActiveRecent = String(chat?.sessionId || '') === currentSessionId;
                return (
                  <Button
                    key={chat.sessionId}
                    onClick={() => navigate(target)}
                    sx={{
                      justifyContent: 'flex-start',
                      borderRadius: '10px',
                      color: isActiveRecent ? '#3A838B' : '#164563',
                      fontFamily: 'DM Sans, Inter, sans-serif',
                      fontSize: 12,
                      fontWeight: isActiveRecent ? 700 : 500,
                      textTransform: 'none',
                      minHeight: 32,
                      px: 1,
                      py: 0.5,
                      bgcolor: isActiveRecent ? SIDEBAR_ACTIVE_BG : 'transparent',
                      '&:hover': { bgcolor: isActiveRecent ? SIDEBAR_ACTIVE_BG : SIDEBAR_HOVER_BG },
                    }}
                  >
                    <Box sx={{ textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>
                      {chat.firstQuestion}
                    </Box>
                  </Button>
                );
              }) : (
                <Typography sx={{ fontFamily: 'DM Sans, Inter, sans-serif', fontSize: 12, color: '#94A3B8', px: 1 }}>
                  No recent conversations yet.
                </Typography>
              )}
            </Box>
          )}
        </Box>
      </Box>

      {SHOW_SIDEBAR_SIGN_IN ? (
        <>
          <Box sx={{ position: 'sticky', bottom: 0, pb: 3, pt: 1, mt: 'auto', bgcolor: '#F8FBFC', zIndex: 1 }}>
            <Button
              onClick={handleOpenUserMenu}
              sx={{
                minWidth: 0,
                justifyContent: 'flex-start',
                borderRadius: open ? '20px' : '50%',
                color: '#64748B',
                fontFamily: 'DM Sans, Inter, sans-serif',
                fontSize: 14,
                fontWeight: 500,
                textTransform: 'none',
                height: 40,
                px: 1.25,
                width: '100%',
                '&:hover': { bgcolor: open ? SIDEBAR_HOVER_BG : 'transparent' },
                '&:hover .sidebar-account-bubble': { bgcolor: SIDEBAR_HOVER_BG },
              }}
            >
              <Box
                className="sidebar-account-bubble"
                sx={{
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  bgcolor: open ? 'transparent' : SIDEBAR_HOVER_BG,
                  transition: 'background-color 150ms ease',
                }}
              >
                {accountIcon}
              </Box>
              <Box
                component="span"
                sx={{
                  ml: open ? 1.1 : 0,
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  maxWidth: open ? 160 : 0,
                  opacity: open ? 1 : 0,
                  transition: 'max-width 200ms ease, opacity 150ms ease',
                }}
              >
                {isAuthenticated ? userDisplayName : 'Sign in'}
              </Box>
            </Button>
          </Box>

          <Menu
            anchorEl={userMenuAnchorEl}
            open={isUserMenuOpen}
            onClose={handleCloseUserMenu}
            anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            transformOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            PaperProps={{
              sx: {
                minWidth: 220,
                borderRadius: '12px',
                boxShadow: '0px 4px 6px -2px rgba(16,24,40,0.03), 0px 12px 16px -4px rgba(16,24,40,0.08)',
                '& .MuiMenuItem-root': {
                  fontFamily: 'Inter',
                  fontSize: 14,
                  color: '#374151',
                },
              },
            }}
          >
            {isAuthenticated ? (
              <MenuItem onClick={handleCloseUserMenu} sx={{ cursor: 'default', '&:hover': { bgcolor: '#FFFFFF' } }}>
                <ListItemText
                  primary={userDisplayName || 'Signed in'}
                  primaryTypographyProps={{ fontFamily: 'Inter', fontWeight: 600, fontSize: 14, color: '#1F2937' }}
                />
              </MenuItem>
            ) : (
              <MenuItem onClick={handleCloseUserMenu} sx={{ cursor: 'default', '&:hover': { bgcolor: '#FFFFFF' } }}>
                <ListItemText
                  primary="PanKgraph Account"
                  secondary="us-east-1_yUEKWJIVn"
                  primaryTypographyProps={{ fontFamily: 'Inter', fontWeight: 600, fontSize: 14, color: '#1F2937' }}
                  secondaryTypographyProps={{ fontFamily: 'Inter', fontSize: 12, color: '#6B7280' }}
                />
              </MenuItem>
            )}
            {!isAuthenticated ? (
              <MenuItem onClick={handleCognitoLogin}>
                <ListItemIcon sx={{ minWidth: 30, color: '#5A6161' }}>
                  <PersonOutlineOutlinedIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText
                  primary="Sign in with Cognito"
                  secondary={auth?.isLoading ? 'Loading auth...' : undefined}
                  secondaryTypographyProps={{ fontFamily: 'Inter', fontSize: 11 }}
                />
              </MenuItem>
            ) : (
              <MenuItem onClick={handleCognitoLogout}>
                <ListItemIcon sx={{ minWidth: 30, color: '#5A6161' }}>
                  <LogoutOutlinedIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary="Log out" />
              </MenuItem>
            )}
          </Menu>
        </>
      ) : null}
    </Box>
  );
}
