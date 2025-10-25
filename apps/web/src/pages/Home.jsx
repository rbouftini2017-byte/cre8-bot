import { Link } from "react-router-dom";

export default function Home() {
  return (
    <div style={{ padding: 24 }}>
      <h1>Cre8-BOT — Stores</h1>
      <ul>
        <li><Link to="/s/nyc">New York</Link> (Day Code: 1111)</li>
        <li><Link to="/s/los-angeles">Los Angeles</Link> (Day Code: 2222)</li>
        <li><Link to="/s/dallas">Dallas</Link> (Day Code: 3333)</li>
      </ul>
    </div>
  );
}
