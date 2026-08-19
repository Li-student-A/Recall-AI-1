import type { ThemeConfig } from 'antd';

export const theme = {
  token: {
    colorPrimary: '#2D4A3E',
    colorBgBase: '#F9F6F0',
    colorBgContainer: '#FDFBF7',
    colorBorder: '#E2DCD3',
    colorText: '#3C3A36',
    colorTextSecondary: '#8A8580',
    colorError: '#B33939',
    colorSuccess: '#5B7A5A',
    colorWarning: '#D4A373',
    colorInfo: '#2D4A3E',
    colorLink: '#2D4A3E',
    borderRadius: 4,
    fontFamily:
      'Georgia, "Noto Serif SC", "Songti SC", "SimSun", system-ui, -apple-system, sans-serif',
    fontSize: 14
  },
  components: {
    Button: {
      borderRadius: 0,
      borderStyle: 'solid',
      fontWeight: 500
    },
    Input: {
      borderStyle: 'none',
      borderBottom: '1px solid #E2DCD3',
      activeBorderBottomColor: '#2D4A3E',
      hoverBorderBottomColor: '#2D4A3E',
      colorBorder: '#E2DCD3'
    },
    Card: {
      colorBgContainer: '#FDFBF7',
      colorBorderSecondary: '#E2DCD3',
      borderRadiusLG: 4,
      boxShadowTertiary: 'none'
    },
    Layout: {
      colorBgBody: '#F9F6F0',
      colorBgHeader: '#F9F6F0',
      colorBgSidebar: '#FDFBF7',
      headerHeight: 56,
      siderWidth: 200
    },
    Menu: {
      itemSelectedBg: 'transparent',
      itemSelectedColor: '#2D4A3E',
      itemHoverColor: '#2D4A3E',
      itemBg: 'transparent',
      itemHeight: 40,
      itemBorderRadius: 0
    },
    List: {
      splitColor: 'transparent'
    },
    Modal: {
      contentBg: '#FDFBF7',
      headerBg: '#FDFBF7'
    },
    Calendar: {
      cellHoverBg: 'rgba(45, 74, 62, 0.05)'
    },
    Table: {
      headerBg: '#F5F0E8',
      headerColor: '#3C3A36',
      borderColor: '#E2DCD3'
    },
    Tag: {
      defaultBg: '#F5F0E8',
      defaultColor: '#3C3A36'
    },
    Segmented: {
      trackBg: '#F5F0E8',
      itemSelectedBg: '#2D4A3E',
      itemSelectedColor: '#FDFBF7'
    }
  }
} as const as ThemeConfig;

export default theme;
