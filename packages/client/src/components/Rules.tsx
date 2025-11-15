export function Rules() {
  return (
    <div className="rules-page">
      <div className="rules-content">
        <h2>How to Play</h2>
        
        <section>
          <h3>Objective</h3>
          <p>Win by getting <strong>3 seniors in a row</strong> (horizontal, vertical, or diagonal) OR by placing all <strong>8 seniors</strong> on the board.</p>
        </section>

        <section>
          <h3>Setup</h3>
          <p>Each player starts with 8 freshers. Players take turns placing pieces on a 6×6 board.</p>
        </section>

        <section>
          <h3>Placing Pieces</h3>
          <ul>
            <li>Choose to place either a <strong>fresher</strong> or a <strong>senior</strong> (if you have seniors available)</li>
            <li>Click an empty space on the board to place your piece</li>
            <li>When you place a piece, it will "boop" adjacent pieces</li>
          </ul>
        </section>

        <section>
          <h3>Booping</h3>
          <ul>
            <li><strong>Seniors</strong> can boop <strong>freshers</strong> (push them one space away)</li>
            <li><strong>Freshers</strong> can boop other <strong>freshers</strong></li>
            <li>Booped pieces move in the same direction as the boop</li>
            <li>If a booped piece would go off the board or is blocked, it returns to your supply</li>
          </ul>
        </section>

        <section>
          <h3>Graduation</h3>
          <ul>
            <li>When you have <strong>8 pieces</strong> on the board, you must remove one before placing</li>
            <li>Removing a <strong>fresher</strong> "graduates" it into a <strong>senior</strong> in your supply</li>
            <li>Removing a <strong>senior</strong> returns it to your supply</li>
          </ul>
        </section>

        <section>
          <h3>Three in a Row</h3>
          <ul>
            <li>If you get <strong>3 of your pieces</strong> in a row (any direction), they are automatically removed</li>
            <li>Removed <strong>freshers</strong> graduate to <strong>seniors</strong> in your supply</li>
            <li>Removed <strong>seniors</strong> return to your supply</li>
            <li>This happens automatically after each move</li>
          </ul>
        </section>

        <section>
          <h3>Winning</h3>
          <p>You win immediately when you get <strong>3 seniors in a row</strong> or when you place your <strong>8th senior</strong> on the board.</p>
        </section>
      </div>
    </div>
  );
}

