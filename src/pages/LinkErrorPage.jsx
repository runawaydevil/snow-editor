import { Link } from 'react-router-dom';
import { STR } from '../lib/strings.js';

export default function LinkErrorPage({ title, message }) {
  return (
    <div className="app link-error-page">
      <header className="app-header">
        <h1 className="app-title">Snow Editor</h1>
      </header>
      <main className="link-error-page__main">
        <h2>{title}</h2>
        <p>{message}</p>
        <Link to="/" className="btn">
          {STR.OPEN_IN_SNOW_EDITOR}
        </Link>
      </main>
    </div>
  );
}
