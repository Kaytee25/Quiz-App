import React from 'react';
import './leaderboard.css';

function Leadboard({ categories }) {
  // Get all scores from localStorage
  const leaderboard = JSON.parse(localStorage.getItem('leaderboard') || '{}');

  // Get all usernames
  const usernames = Object.keys(leaderboard);

  return (
    <div className="leaderboard-container">
      <h2>Leaderboard</h2>
      <table className="leaderboard-table">
        <thead>
          <tr>
            <th>User</th>
            {categories.map(cat => (
              <th key={cat.id}>{cat.name}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {usernames.length === 0 ? (
            <tr>
              <td colSpan={categories.length + 1}>No scores yet.</td>
            </tr>
          ) : (
            usernames.map(username => (
              <tr key={username}>
                <td>{username}</td>
                {categories.map(cat => (
                  <td key={cat.id}>
                    {leaderboard[username][cat.name] !== undefined
                      ? `${leaderboard[username][cat.name]}%`
                      : '-'}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default Leadboard;

