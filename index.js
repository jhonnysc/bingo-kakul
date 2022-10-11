import React from 'react';
import ReactDOM from 'react-dom';
import { optimizeBingo, getNeighbors, redSkulls, randomBoard } from './optimizer';

import './Bingo.scss';
import classNames from 'classnames';
import Slider from 'ui/slider';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faFastBackward, faHome, faThumbsDown, faThumbsUp, faUndo } from '@fortawesome/free-solid-svg-icons';
import { faCheckSquare, faSquare } from '@fortawesome/free-regular-svg-icons';

function BingoSelect({ onSelect, practice, setPractice }) {
  return (
    <div className="lap-bingo-select">
      <h3>Kakul-Saydon Bingo Assistant</h3>
      <div className="lap-caption">Select difficulty:</div>
      <div className="lap-buttons">
      <div className="lap-button lap-normal" onClick={() => onSelect(false)}>
          <div className="lap-image"/>
          <div className="lap-caption">Normal</div>
        </div>
        <div className="lap-button lap-hell" onClick={() => onSelect(true)}>
          <div className="lap-image"/>
          <div className="lap-caption">Inferno</div>
        </div>
      </div>
      <div className="lap-modes">
        <div className={classNames("lap-mode", {"lap-active": !practice})} onClick={() => setPractice(false)}>
          <div className="lap-header">
            <FontAwesomeIcon className="lap-check" icon={!practice ? faCheckSquare : faSquare}/>
            <div className="lap-name">Assistant mode</div>
          </div>
          <div className="lap-description">
            In this mode the tool will suggest optimal spots to place the bombs on each turn.
          </div>
        </div>
        <div className={classNames("lap-mode", {"lap-active": practice})} onClick={() => setPractice(true)}>
          <div className="lap-header">
            <FontAwesomeIcon className="lap-check" icon={practice ? faCheckSquare : faSquare}/>
            <div className="lap-name">Practice mode</div>
          </div>
          <div className="lap-description">
            In this mode you're free to practice your bingo skills without assistance, though an option to show hints is still available.
          </div>
        </div>
      </div>
      <div className="lap-spacer"/>
      <div className="lap-credits">
        <p>
          This tool will help you get through the Bingo mechanic in Gate 3 of the Kakul-Saydon Legion raid.
          {' '}
          <a href="https://maxroll.gg/lost-ark/legion-raids/kakul-saydon-gate-3" target="_blank" rel="noopener noreferrer">
            Click here to read our detailed guide for this encounter.
          </a>
        </p>
        <p>
          The tool chooses optimal places to place bombs by simulating the board state up to 4 turns ahead and trying
          to leave as much space as possible around the middle area for ease of movement. The optimization formula uses
          ideas from the original algorithm used in
          {' '}
          <a href="https://github.com/ialy1595/kouku-saton-bingo" target="_blank" rel="noopener noreferrer" className="lep-external">
            https://github.com/{'\u200b'}ialy1595/{'\u200b'}kouku-saton-bingo
          </a>
        </p>
      </div>
    </div>
  );
}

function BingoTool() {
  const [history, setHistory] = React.useState([0]);
  const [hellMask, setHellMask] = React.useState(0);
  const [round, setRound] = React.useState(-3);
  const [hover, setHover] = React.useState(0);
  const [inanna, setInanna] = React.useState(false);
  const [hellMode, setHellMode] = React.useState(false);
  const [preferSkull, setPreferSkull] = React.useState(2);
  const [practice, setPractice] = React.useState(false);
  const [message, setMessage] = React.useState(null);
  const [showHint, setShowHint] = React.useState(false);
  const [randomPlace, setRandomPlace] = React.useState(false);
  const state = history[history.length - 1];
  const setState = value => setHistory(h => [...h, value]);
  const red = redSkulls(state);
  const onHome = () => setRound(-3);
  const onUndo = () => {
    if (history.length > 1) {
      setHistory(h => h.slice(0, h.length - 1));
    } else {
      setHellMask(0);
    }
    setRound(round - 1);
    setMessage(null);
  };
  const onStart = (hell, randomize) => {
    setInanna(false);
    setHover(0);
    setHellMode(hell);
    setMessage(null);
    setRandomPlace(randomize);
    if (practice && randomize) {
      const board = randomBoard(hell);
      setHistory([board[0]]);
      setHellMask(board[1]);
      setRound(0);
    } else {
      setHistory([0]);
      setHellMask(0);
      setRound(-2);
    }
  };
  const onSetRandom = random => {
    if (random && round < 0) {
      onStart(hellMode, random);
    } else {
      setRandomPlace(random);
    }
  };
  const onReset = () => onStart(hellMode, randomPlace);
  const onClick = mask => {
    if (message && message.failure) return;
    if (round < 0) {
      if ((state | hellMask) & mask) return;
      if (round === -2 && hellMode) {
        setHellMask(mask);
      } else {
        setState(state | mask);
      }
      setRound(round + 1);
    } else {
      const nbhd = getNeighbors(mask);
      if ((nbhd & hellMask) && !practice) {
        return;
      }
      const nextState = (state ^ nbhd) | redSkulls(state);
      setState(nextState);
      setRound(round + 1);
      setShowHint(false);
      if (nbhd & hellMask) {
        setMessage({text: 'Skull placed on special tile, game over!', failure: true});
      } else if ((round % 3) === 2) {
        if (inanna) {
          setInanna(false);
        } else if (practice && redSkulls(state) === redSkulls(nextState)) {
          setMessage({text: 'No bingo for mechanic, use Inanna or it\'s game over!'});
        }
      } else {
        setMessage(null);
      }
    }
  };
  const onEnter = mask => {
    if (!mask) {
      setHover(0);
    } else if (round < 0) {
      if ((state | hellMask) & mask) {
        setHover(0);
      } else {
        setHover(mask);
      }
    } else if (practice) {
      setHover(mask);
    } else {
      const nbhd = getNeighbors(mask) & (~redSkulls(state));
      if (nbhd & hellMask) {
        setHover(-mask);
      } else {
        setHover(nbhd);
      }
    }
  };
  const optimal = React.useMemo(() => optimizeBingo(state, hellMask, round, inanna, preferSkull), [state, hellMask, round, inanna, preferSkull]);

  if (round < -2) {
    return <BingoSelect onSelect={hell => onStart(hell, randomPlace)} practice={practice} setPractice={setPractice}/>;
  }

  return <>
    <div className="lap-bingo-options lap-buttons">
      <button onClick={onHome}><FontAwesomeIcon icon={faHome}/> Home</button>
      <button onClick={onReset} disabled={(history.length < 2 && !hellMask) && !practice}><FontAwesomeIcon icon={faFastBackward}/> Reset</button>
      <button onClick={onUndo} disabled={history.length < 2 && !hellMask}><FontAwesomeIcon icon={faUndo}/> Undo</button>
    </div>
    <div className="lap-bingo-options">
      {!!practice && (
        <label>
          <input type="checkbox" checked={randomPlace} onChange={e => onSetRandom(!!e.target.checked)}/>
          Randomize initial state
        </label>
      )}
      {!!practice && (
        <label>
          <input type="checkbox" checked={showHint} onChange={e => setShowHint(!!e.target.checked)}/>
          Show hint
        </label>
      )}
      {!practice && (
        <label className={classNames("lap-inanna", {"lap-active": inanna})}>
          <input type="checkbox" checked={inanna} onChange={e => setInanna(!!e.target.checked)}/>
          <span className="lap-icon"/>Use Inanna for next mechanic
        </label>
      )}
      {!practice && (
        <div className="lap-bombs">
          Bombs on skulls:
          <div className="lap-slider">
            <FontAwesomeIcon icon={faThumbsUp} onClick={() => setPreferSkull(Math.max(0, preferSkull - 1))}/>
            <Slider min={0} max={4} step={1} value={preferSkull} onChange={setPreferSkull}/>
            <FontAwesomeIcon icon={faThumbsDown} onClick={() => setPreferSkull(Math.min(4, preferSkull + 1))}/>
          </div>
        </div>
      )}
    </div>
    <div className="lap-bingo-instructions">
      <p>
        {round < 0 ? (
          hellMode ? (
            round === -2 ? `Place special tile` : `Place initial skull`
          ) : (
            `Place initial skulls`
          )
        ) : (
          optimal.length || practice ? (
            !inanna && (round % 3) === 2 ? `Round ${round + 1} (Bingo)` : `Round ${round + 1}`
          ) : (
            `No more bingo possible, use Inanna or it's game over!`
          )
        )}
      </p>
      {!!message && <p className="lap-warning">{message.text}</p>}
    </div>
    <div className="lap-BingoTable">
      <table>
        <tbody>
          <tr className="lap-label-row">
            <td className="lap-label"/>
            {[...'ABCDE'].map(x => <td className="lap-label"><span>{x}</span></td>)}
          </tr>
          {[...Array(5)].map((_, y) => (
            <tr key={y}>
              <td className="lap-label"><span>{5 - y}</span></td>
              {[...Array(5)].map((_, x) => {
                const mask = 1 << (y * 5 + x);
                const classes = ['lap-tile'];
                if (red & mask) classes.push('lap-bingo');
                if (state & mask) classes.push('lap-skull');
                if (hellMask & mask) classes.push('lap-hell');
                const optIndex = (round >= 0 && (!practice || showHint) ? optimal.indexOf(mask) : -1);
                if (optIndex >= 0) classes.push(`lap-optimal-${optIndex + 1}`);
                if (hover < 0) {
                  if ((-hover) & mask) classes.push('lap-unhover');
                } else {
                  if (hover & mask) classes.push('lap-hover');
                }
                return (
                  <td key={x} className={classes.join(' ')} onClick={() => onClick(mask)} onMouseEnter={() => onEnter(mask)} onMouseLeave={() => onEnter(0)}>
                    {optIndex >= 0 && <span className="lap-optimal">#{optIndex + 1}</span>}
                  </td>
                );
              })}
              <td className="lap-label"><span>{5 - y}</span></td>
            </tr>
          ))}
          <tr className="lap-label-row">
            <td className="lap-label"/>
            {[...'ABCDE'].map(x => <td className="lap-label"><span>{x}</span></td>)}
          </tr>
        </tbody>
      </table>
    </div>
  </>;
}

document.addEventListener("DOMContentLoaded", async () => {
  const root = document.querySelector('.laplanner-bingo');
  if (!root) return;

  root.closest('#mxrl-main').style.display = 'flex';
  root.closest('#mxrl-main').style.flexDirection = 'column';
  root.closest('#mxrl-main').style.minHeight = 'calc(100vh - 150px)';
  root.closest('#mxrl-main').style.padding = '10px 0';
  root.classList.add('laplanner-wrapper');
  ReactDOM.render((
    <BingoTool/>
  ), root);
});
