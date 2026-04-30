import React, {
  useEffect,
  useState,
} from 'react';

import { useAuth } from 'react-oidc-context';
import {
  useLocation,
  useNavigate,
} from 'react-router-dom';

import AddCommentOutlinedIcon from '@mui/icons-material/AddCommentOutlined';
import AutoGraphOutlinedIcon from '@mui/icons-material/AutoGraphOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import PersonOutlineOutlinedIcon
  from '@mui/icons-material/PersonOutlineOutlined';
import {
  Avatar,
  Box,
  Button,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Typography,
} from '@mui/material';

import { readRecentChats } from '../utils/chatSessionStorage';

const utf8ToBase64 = (str) => btoa(unescape(encodeURIComponent(str)));

function SidebarButton({ active, icon, label, onClick }) {
  return (
    <Button
      disableElevation
      startIcon={icon}
      onClick={onClick}
      sx={{
        justifyContent: 'flex-start',
        borderRadius: '9999px',
        bgcolor: active ? '#FFFFFF' : 'transparent',
        color: active ? '#006766' : '#5A6161',
        fontFamily: 'Inter',
        fontSize: 14,
        fontWeight: 500,
        textTransform: 'none',
        height: 44,
        px: 2,
        '&:hover': {
          bgcolor: active ? '#FFFFFF' : 'rgba(255,255,255,0.6)',
        },
      }}
    >
      {label}
    </Button>
  );
}

export default function AgentSidebar({ activeNav = 'new-chat' }) {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useAuth();
  const [recentChats, setRecentChats] = useState([]);
  const [userMenuAnchorEl, setUserMenuAnchorEl] = useState(null);

  useEffect(() => {
    setRecentChats(readRecentChats());
  }, [location.pathname, location.search]);

  const isUserMenuOpen = Boolean(userMenuAnchorEl);
  const userProfile = auth?.user?.profile || {};
  const userDisplayName = userProfile?.email || userProfile?.name || userProfile?.preferred_username || 'Account';
  const isAuthenticated = Boolean(auth?.isAuthenticated);

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
        width: 288,
        bgcolor: '#F0F4F4',
        px: 3,
        py: 3,
        display: { xs: 'none', lg: 'flex' },
        flexDirection: 'column',
        boxShadow: '32px 0 64px -20px rgba(0, 106, 106, 0.04)',
      }}
    >
      <Typography sx={{ fontFamily: 'Inter', fontWeight: 700, fontSize: 24, color: '#006766', mb: 2 }}>
        PanKgraph
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, flex: 1 }}>
        <SidebarButton
          active={activeNav === 'new-chat'}
          icon={<AddCommentOutlinedIcon sx={{ color: activeNav === 'new-chat' ? '#006766' : '#5A6161' }} />}
          label="New Chat"
          onClick={() => navigate('/')}
        />
        <SidebarButton
          active={activeNav === 'skills'}
          icon={<AutoGraphOutlinedIcon sx={{ color: activeNav === 'skills' ? '#006766' : '#5A6161' }} />}
          label="Skills"
          onClick={() => navigate('/skills')}
        />
        <SidebarButton
          active={activeNav === 'recent'}
          icon={<HistoryOutlinedIcon sx={{ color: activeNav === 'recent' ? '#006766' : '#5A6161' }} />}
          label="Recent"
          onClick={() => {}}
        />

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
            const target = `/result-new2?question=${encodedQuestion}&terminal=true&session_id=${encodeURIComponent(chat.sessionId)}`;
            return (
              <Button
                key={chat.sessionId}
                onClick={() => navigate(target)}
                sx={{
                  justifyContent: 'flex-start',
                  borderRadius: '12px',
                  color: '#405252',
                  fontFamily: 'Inter',
                  fontSize: 12,
                  fontWeight: 500,
                  textTransform: 'none',
                  minHeight: 34,
                  px: 1.5,
                  py: 0.75,
                  bgcolor: 'rgba(255,255,255,0.75)',
                  '&:hover': { bgcolor: '#FFFFFF' },
                }}
              >
                <Box sx={{ textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>
                  {chat.firstQuestion}
                </Box>
              </Button>
            );
          }) : (
            <Typography sx={{ fontFamily: 'Inter', fontSize: 12, color: '#7B8A8A', px: 2 }}>
              No recent conversations yet.
            </Typography>
          )}
        </Box>
      </Box>
      <Box>
        <Button
          startIcon={(
            isAuthenticated ? (
              <Avatar sx={{ width: 24, height: 24, bgcolor: '#DDF4F0', color: '#006766', fontSize: 12, fontWeight: 700 }}>
                {String(userDisplayName || 'A').charAt(0).toUpperCase()}
              </Avatar>
            ) : (
              <PersonOutlineOutlinedIcon sx={{ color: '#5A6161' }} />
            )
          )}
          onClick={handleOpenUserMenu}
          sx={{ justifyContent: 'flex-start', borderRadius: '9999px', color: '#5A6161', fontFamily: 'Inter', fontSize: 14, fontWeight: 500, textTransform: 'none', height: 44, px: 2, width: '100%' }}
        >
          {isAuthenticated ? userDisplayName : 'Sign in'}
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
    </Box>
  );
}
