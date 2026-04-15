import packageJson from '../../package.json';
import './AppFooter.css';

export default function AppFooter() {
  return (
    <footer className="app-footer">
      v{packageJson.version} • Built {__BUILD_DATE__}
    </footer>
  );
}
