
const ROWS = [
  [7, 9, 8],
  [5, 11, 12, 6],
  [3, 10, 4],
  [1, 2],
];

const ROLE_OPTIONS = [
  "Père",
  "Mère",
  "Fils",
  "Fille",
  "Frère",
  "Sœur",
  "Grand-père",
  "Grand-mère",
  "Oncle",
  "Tante",
  "Cousin",
  "Cousine",
  "Ami(e)",
  "Autre",
];

const EMPTY_STATS = {
  throws: 0,
  hits: 0,
  missesTotal: 0,
  bestThrow: 0,
  bustCount: 0,
  longestMissStreak: 0,
  soloThrows: 0,
  multiThrows: 0,
  soloPoints: 0,
  multiPoints: 0,
  scoreHistory: [],
};

const EMPTY_PLAYER_STATS = {
  gamesPlayed: 0,
  wins: 0,
  soloGames: 0,
  soloAccSum: 0,
  soloAccCount: 0,
  soloBestThrow: 0,
  soloMisses: 0,
  soloBusts: 0,
};

const DEFAULT_SETTINGS = {
  precision: true,
  sniper: true,
  kamikaze: true,
  glacon: true,
  marathon: true,
  soloMulti: true,
  clutch: true,
  comeback: true,
  classement: true,
  moyennePrecision: true,
  roi50: true,
  malediction25: true,
  rapide: true,
  marathonien: true,
  serie: true,
  recordPrecision: true,
  playerStats: true,
  familyStats: true,
  rolesFun: true,
};

const STAT_LABELS = {
  precision: { emoji: "🎯", label: "Précision par équipe" },
  sniper: { emoji: "🔥", label: "Le Sniper (meilleur lancer)" },
  kamikaze: { emoji: "💥", label: "Le Kamikaze (plus de dépassements)" },
  glacon: { emoji: "🧊", label: "Le Glaçon (plus longue série de ratés)" },
  marathon: { emoji: "🐌", label: "Le Marathon (nombre de lancers)" },
  soloMulti: { emoji: "🎲", label: "Solo vs Multi-quilles" },
  clutch: { emoji: "⚡", label: "Le Clutch (victoire serrée)" },
  comeback: { emoji: "😮‍💨", label: "Le Grand Retour (comeback)" },
  classement: { emoji: "🏆", label: "Classement général (victoires)" },
  moyennePrecision: { emoji: "📊", label: "Précision moyenne (historique)" },
  roi50: { emoji: "👑", label: "Le Roi du 50 (jamais dépassé)" },
  malediction25: { emoji: "☠️", label: "La Malédiction du 25 (cumulé)" },
  rapide: { emoji: "⏱️", label: "Partie la plus rapide" },
  marathonien: { emoji: "🐢", label: "Partie la plus longue" },
  serie: { emoji: "🔄", label: "Série de victoires en cours" },
  recordPrecision: { emoji: "🌟", label: "Meilleure précision jamais vue" },
  playerStats: { emoji: "👤", label: "Stats individuelles par joueur" },
  familyStats: { emoji: "👨‍👩‍👧‍👦", label: "Stats par famille" },
  rolesFun: { emoji: "🏅", label: "Meilleur par rôle (père, mère...)" },
};

async function loadFromStorage(key) {
  try {
    const raw = window.localStorage.getItem("molkky:" + key);
    return raw !== null ? raw : null;
  } catch (e) {
    return null;
  }
}

async function saveToStorage(key, value) {
  try {
    window.localStorage.setItem("molkky:" + key, value);
  } catch (e) {}
}

function Pin({ number, isDown, disabled, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={`Quille ${number}`}
      className="relative w-12 h-12 rounded-full flex items-center justify-center focus:outline-none disabled:cursor-not-allowed"
      style={{
        background: isDown
          ? "linear-gradient(160deg, #a3a3a3, #6b6b6b)"
          : "radial-gradient(circle at 35% 30%, #f5e2b8, #d8a758 55%, #a97c3f 100%)",
        border: `2px solid ${isDown ? "#4b4b4b" : "#7a5324"}`,
        boxShadow: isDown
          ? "inset 0 2px 4px rgba(0,0,0,0.35)"
          : "inset -3px -4px 6px rgba(122,83,36,0.35), inset 2px 2px 4px rgba(255,255,255,0.5), 0 2px 3px rgba(0,0,0,0.3)",
        transform: isDown ? "scale(0.92)" : "none",
        transition: "transform 0.2s ease, background 0.2s ease, opacity 0.2s ease",
        opacity: disabled && !isDown ? 0.35 : 1,
      }}
    >
      <span
        className="text-lg font-extrabold"
        style={{
          color: isDown ? "#e5e5e5" : "#5a3a1a",
          textShadow: isDown ? "none" : "0 1px 0 rgba(255,255,255,0.4)",
        }}
      >
        {number}
      </span>
      {isDown && (
        <span
          className="absolute inset-0 rounded-full"
          style={{ border: "2px solid #e5e5e5", opacity: 0.4 }}
        />
      )}
    </button>
  );
}

function scoreAtTime(team, ts) {
  let val = 0;
  for (const entry of team.stats.scoreHistory) {
    if (entry.ts <= ts) val = entry.score;
    else break;
  }
  return val;
}

function computeGameSummary(updatedTeams) {
  const winner = updatedTeams.find((t) => t.score === 50);
  if (!winner) return null;

  const totalThrows = updatedTeams.reduce((s, t) => s + t.stats.throws, 0);

  let sniper = updatedTeams[0];
  let kamikaze = updatedTeams[0];
  let glacon = updatedTeams[0];
  updatedTeams.forEach((t) => {
    if (t.stats.bestThrow > sniper.stats.bestThrow) sniper = t;
    if (t.stats.bustCount > kamikaze.stats.bustCount) kamikaze = t;
    if (t.stats.longestMissStreak > glacon.stats.longestMissStreak) glacon = t;
  });

  const wHistory = winner.stats.scoreHistory;
  const preWinScore =
    wHistory.length >= 2 ? wHistory[wHistory.length - 2].score : 0;
  const isClutch = preWinScore >= 47;

  let minDeficit = 0;
  wHistory.forEach((entry) => {
    const others = updatedTeams.filter((t) => t.id !== winner.id);
    const maxOther = others.reduce(
      (m, t) => Math.max(m, scoreAtTime(t, entry.ts)),
      0
    );
    const deficit = entry.score - maxOther;
    if (deficit < minDeficit) minDeficit = deficit;
  });
  const comeback = minDeficit < 0 ? Math.abs(minDeficit) : 0;

  const teamSummaries = updatedTeams.map((t) => ({
    name: t.name,
    playerIds: t.playerIds || [],
    score: t.score,
    throws: t.stats.throws,
    hits: t.stats.hits,
    missesTotal: t.stats.missesTotal,
    accuracy: t.stats.throws
      ? Math.round((t.stats.hits / t.stats.throws) * 100)
      : 0,
    bestThrow: t.stats.bestThrow,
    bustCount: t.stats.bustCount,
    longestMissStreak: t.stats.longestMissStreak,
    soloThrows: t.stats.soloThrows,
    multiThrows: t.stats.multiThrows,
    soloPoints: t.stats.soloPoints,
    multiPoints: t.stats.multiPoints,
    totalPinsDown: t.stats.soloThrows + t.stats.multiPoints,
  }));

  return {
    date: new Date().toISOString(),
    winner: winner.name,
    totalThrows,
    sniper: { name: sniper.name, value: sniper.stats.bestThrow },
    kamikaze: { name: kamikaze.name, value: kamikaze.stats.bustCount },
    glacon: { name: glacon.name, value: glacon.stats.longestMissStreak },
    clutch: { isClutch, preWinScore },
    comeback,
    teams: teamSummaries,
  };
}

function computeAllTimeStats(recs) {
  const winsByName = {};
  const accByName = {};
  const roi50ByName = {};
  const bustByName = {};
  let fastest = null;
  let longest = null;

  recs.forEach((r) => {
    winsByName[r.winner] = (winsByName[r.winner] || 0) + 1;
    r.teams.forEach((t) => {
      if (!accByName[t.name]) accByName[t.name] = { sum: 0, count: 0 };
      accByName[t.name].sum += t.accuracy;
      accByName[t.name].count += 1;
      if (t.name === r.winner && t.bustCount === 0) {
        roi50ByName[t.name] = (roi50ByName[t.name] || 0) + 1;
      }
      bustByName[t.name] = (bustByName[t.name] || 0) + t.bustCount;
    });
    if (fastest === null || r.totalThrows < fastest.totalThrows) fastest = r;
    if (longest === null || r.totalThrows > longest.totalThrows) longest = r;
  });

  let currentStreak = { name: null, count: 0 };
  if (recs.length > 0) {
    const sorted = [...recs].sort((a, b) => new Date(b.date) - new Date(a.date));
    const lastWinner = sorted[0].winner;
    let count = 0;
    for (const r of sorted) {
      if (r.winner === lastWinner) count++;
      else break;
    }
    currentStreak = { name: lastWinner, count };
  }

  let bestAcc = null;
  recs.forEach((r) => {
    r.teams.forEach((t) => {
      if (bestAcc === null || t.accuracy > bestAcc.accuracy) {
        bestAcc = { name: t.name, accuracy: t.accuracy, date: r.date };
      }
    });
  });

  return {
    winsByName,
    accByName,
    roi50ByName,
    bustByName,
    fastest,
    longest,
    currentStreak,
    bestAcc,
  };
}

function generateFunTeamName(chosenPlayers, families) {
  if (chosenPlayers.length === 0) return "";

  if (chosenPlayers.length === 1) {
    const p = chosenPlayers[0];
    const solo = [
      `${p.firstName} en solo`,
      `${p.firstName} contre tous`,
      `Team ${p.firstName}`,
      `${p.firstName} l'Unique`,
    ];
    return solo[Math.floor(Math.random() * solo.length)];
  }

  const roles = chosenPlayers.map((p) => p.role);
  const ages = chosenPlayers
    .map((p) => Number(p.age))
    .filter((a) => !isNaN(a) && a > 0);
  const avgAge = ages.length ? ages.reduce((a, b) => a + b, 0) / ages.length : null;
  const ageRange = ages.length >= 2 ? Math.max(...ages) - Math.min(...ages) : 0;
  const sexes = chosenPlayers.map((p) => p.sex);
  const familyIds = [...new Set(chosenPlayers.map((p) => p.familyId))];
  const sameFamily = familyIds.length === 1;
  const familyName = sameFamily
    ? (families.find((f) => f.id === familyIds[0]) || {}).name
    : null;

  const candidates = [];

  function hasRolePair(r1, r2) {
    return chosenPlayers.length === 2 && roles.includes(r1) && roles.includes(r2);
  }

  if (chosenPlayers.length === 2) {
    if (hasRolePair("Père", "Fils"))
      candidates.push("Duo Père-Fils", "Papa & Fiston", "Les Compères");
    if (hasRolePair("Père", "Fille"))
      candidates.push("Duo Père-Fille", "Team Papa-Poule");
    if (hasRolePair("Mère", "Fils"))
      candidates.push("Duo Mère-Fils", "Maman & son Champion");
    if (hasRolePair("Mère", "Fille"))
      candidates.push("Duo Mère-Fille", "Les Complices");
    if (hasRolePair("Frère", "Sœur"))
      candidates.push("Fratrie en Force", "Team Frère-Sœur");
    if (hasRolePair("Frère", "Frère"))
      candidates.push("Les Frères de Sang", "Duo Fraternel");
    if (hasRolePair("Sœur", "Sœur"))
      candidates.push("Les Sœurs Terribles", "Duo de Choc");
    if (
      hasRolePair("Grand-père", "Fils") ||
      hasRolePair("Grand-père", "Fille") ||
      hasRolePair("Grand-mère", "Fils") ||
      hasRolePair("Grand-mère", "Fille")
    )
      candidates.push("3 Générations", "Sagesse & Fougue");
  }

  if (sameFamily && chosenPlayers.length >= 3) {
    candidates.push(
      `Le Clan ${familyName}`,
      `Les ${familyName} au Complet`,
      `La Dream Team ${familyName}`
    );
  }

  if (!sameFamily) {
    candidates.push("Coalition Inter-Familles", "L'Alliance Improbable", "Le Melting-Pot");
  }

  if (avgAge !== null && avgAge < 15) {
    candidates.push("Les Marmots Déchaînés", "La Relève");
  }
  if (avgAge !== null && avgAge > 60) {
    candidates.push("Le Conseil des Sages", "Les Vétérans");
  }
  if (ageRange >= 30) {
    candidates.push("Duo Intergénérationnel", "3 Générations Unies");
  }

  if (sexes.every((s) => s === "F")) {
    candidates.push("Les Amazones", "Girl Power");
  }
  if (sexes.every((s) => s === "H")) {
    candidates.push("Les Costauds", "Team Muscle");
  }

  if (candidates.length === 0) {
    return chosenPlayers.map((p) => p.firstName).join(" & ");
  }

  return candidates[Math.floor(Math.random() * candidates.length)];
}

function MolkkyTracker() {
  const [teams, setTeams] = useState([
    { id: 1, name: "Anne", playerIds: [], score: 0, misses: 0, eliminated: false, stats: { ...EMPTY_STATS, scoreHistory: [] } },
    { id: 2, name: "Hugo", playerIds: [], score: 0, misses: 0, eliminated: false, stats: { ...EMPTY_STATS, scoreHistory: [] } },
  ]);
  const [nextId, setNextId] = useState(3);
  const [newName, setNewName] = useState("");
  const [history, setHistory] = useState([]);
  const [status, setStatus] = useState("");
  const [gameOver, setGameOver] = useState(false);
  const [selections, setSelections] = useState({});

  const [statsSettings, setStatsSettings] = useState(DEFAULT_SETTINGS);
  const [gameHistoryRecords, setGameHistoryRecords] = useState([]);
  const [resultsSummary, setResultsSummary] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Profils : familles & joueurs
  const [families, setFamilies] = useState([]); // [{id, name}]
  const [players, setPlayers] = useState([]); // [{id, familyId, firstName, sex, age, role}]
  const [playerStats, setPlayerStats] = useState({}); // { [playerId]: {...} }
  const [showProfiles, setShowProfiles] = useState(false);
  const [activeFamilyId, setActiveFamilyId] = useState(null);
  const [newFamilyName, setNewFamilyName] = useState("");
  const [newPlayerDraft, setNewPlayerDraft] = useState({
    firstName: "",
    sex: "H",
    age: "",
    role: "Autre",
  });

  // Sélecteur de joueurs pour créer une équipe depuis les profils
  const [showPlayerPicker, setShowPlayerPicker] = useState(false);
  const [pickerSelected, setPickerSelected] = useState([]);
  const [pickerLabel, setPickerLabel] = useState("");
  const [nextFamilyId, setNextFamilyId] = useState(1);
  const [nextPlayerId, setNextPlayerId] = useState(1);

  // Sauvegarde manuelle & backup texte
  const [showBackup, setShowBackup] = useState(false);
  const [importText, setImportText] = useState("");
  const [saveMsg, setSaveMsg] = useState("");

  useEffect(() => {
    (async () => {
      const rawSettings = await loadFromStorage("molkky_stats_settings");
      if (rawSettings) {
        try {
          setStatsSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(rawSettings) });
        } catch (e) {}
      }
      const rawHistory = await loadFromStorage("molkky_history");
      if (rawHistory) {
        try {
          setGameHistoryRecords(JSON.parse(rawHistory));
        } catch (e) {}
      }
      const rawFamilies = await loadFromStorage("molkky_families");
      if (rawFamilies) {
        try {
          const f = JSON.parse(rawFamilies);
          setFamilies(f);
          const maxId = f.reduce((m, x) => Math.max(m, x.id), 0);
          setNextFamilyId(maxId + 1);
        } catch (e) {}
      }
      const rawPlayers = await loadFromStorage("molkky_players");
      if (rawPlayers) {
        try {
          const p = JSON.parse(rawPlayers);
          setPlayers(p);
          const maxId = p.reduce((m, x) => Math.max(m, x.id), 0);
          setNextPlayerId(maxId + 1);
        } catch (e) {}
      }
      const rawPlayerStats = await loadFromStorage("molkky_player_stats");
      if (rawPlayerStats) {
        try {
          setPlayerStats(JSON.parse(rawPlayerStats));
        } catch (e) {}
      }
    })();
  }, []);

  function toggleSetting(key) {
    setStatsSettings((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      saveToStorage("molkky_stats_settings", JSON.stringify(updated));
      return updated;
    });
  }

  function saveHistoryRecord(record) {
    setGameHistoryRecords((prev) => {
      const updatedArr = [...prev, record].slice(-200);
      saveToStorage("molkky_history", JSON.stringify(updatedArr));
      return updatedArr;
    });
  }

  // --- Gestion familles & joueurs ---
  function addFamily() {
    const name = newFamilyName.trim();
    if (!name) return;
    const fam = { id: nextFamilyId, name };
    const updated = [...families, fam];
    setFamilies(updated);
    saveToStorage("molkky_families", JSON.stringify(updated));
    setNextFamilyId((n) => n + 1);
    setNewFamilyName("");
    setActiveFamilyId(fam.id);
  }

  function removeFamily(id) {
    const updatedFamilies = families.filter((f) => f.id !== id);
    const updatedPlayers = players.filter((p) => p.familyId !== id);
    setFamilies(updatedFamilies);
    setPlayers(updatedPlayers);
    saveToStorage("molkky_families", JSON.stringify(updatedFamilies));
    saveToStorage("molkky_players", JSON.stringify(updatedPlayers));
    if (activeFamilyId === id) setActiveFamilyId(null);
  }

  function addPlayer() {
    if (!activeFamilyId) return;
    const firstName = newPlayerDraft.firstName.trim();
    if (!firstName) return;
    const player = {
      id: nextPlayerId,
      familyId: activeFamilyId,
      firstName,
      sex: newPlayerDraft.sex,
      age: newPlayerDraft.age,
      role: newPlayerDraft.role,
    };
    const updated = [...players, player];
    setPlayers(updated);
    saveToStorage("molkky_players", JSON.stringify(updated));
    setNextPlayerId((n) => n + 1);
    setNewPlayerDraft({ firstName: "", sex: "H", age: "", role: "Autre" });
  }

  function removePlayer(id) {
    const updated = players.filter((p) => p.id !== id);
    setPlayers(updated);
    saveToStorage("molkky_players", JSON.stringify(updated));
  }

  async function saveNow() {
    await saveToStorage("molkky_families", JSON.stringify(families));
    await saveToStorage("molkky_players", JSON.stringify(players));
    await saveToStorage("molkky_player_stats", JSON.stringify(playerStats));
    await saveToStorage("molkky_history", JSON.stringify(gameHistoryRecords));
    await saveToStorage("molkky_stats_settings", JSON.stringify(statsSettings));
    setSaveMsg("Sauvegardé ✅");
    setTimeout(() => setSaveMsg(""), 2500);
  }

  function buildBackupString() {
    return JSON.stringify(
      { families, players, playerStats, gameHistoryRecords, statsSettings },
      null,
      0
    );
  }

  function restoreFromBackup() {
    try {
      const data = JSON.parse(importText);
      if (data.families) {
        setFamilies(data.families);
        saveToStorage("molkky_families", JSON.stringify(data.families));
        const maxId = data.families.reduce((m, x) => Math.max(m, x.id), 0);
        setNextFamilyId(maxId + 1);
      }
      if (data.players) {
        setPlayers(data.players);
        saveToStorage("molkky_players", JSON.stringify(data.players));
        const maxId = data.players.reduce((m, x) => Math.max(m, x.id), 0);
        setNextPlayerId(maxId + 1);
      }
      if (data.playerStats) {
        setPlayerStats(data.playerStats);
        saveToStorage("molkky_player_stats", JSON.stringify(data.playerStats));
      }
      if (data.gameHistoryRecords) {
        setGameHistoryRecords(data.gameHistoryRecords);
        saveToStorage("molkky_history", JSON.stringify(data.gameHistoryRecords));
      }
      if (data.statsSettings) {
        const merged = { ...DEFAULT_SETTINGS, ...data.statsSettings };
        setStatsSettings(merged);
        saveToStorage("molkky_stats_settings", JSON.stringify(merged));
      }
      setImportText("");
      setSaveMsg("Restauré ✅");
      setTimeout(() => setSaveMsg(""), 2500);
    } catch (e) {
      setSaveMsg("Erreur : le texte collé n'est pas valide");
      setTimeout(() => setSaveMsg(""), 3000);
    }
  }

  // --- Gestion des équipes en jeu ---
  function pushHistory() {
    setHistory((h) =>
      [...h, { teams: JSON.parse(JSON.stringify(teams)), gameOver }].slice(-50)
    );
  }

  function addTeam() {
    const name = newName.trim();
    if (!name) return;
    setTeams((t) => [
      ...t,
      {
        id: nextId,
        name,
        playerIds: [],
        score: 0,
        misses: 0,
        eliminated: false,
        stats: { ...EMPTY_STATS, scoreHistory: [] },
      },
    ]);
    setNextId((n) => n + 1);
    setNewName("");
  }

  function togglePickerPlayer(playerId) {
    setPickerSelected((sel) =>
      sel.includes(playerId)
        ? sel.filter((id) => id !== playerId)
        : [...sel, playerId]
    );
  }

  function createTeamFromPlayers() {
    if (pickerSelected.length === 0) return;
    const chosen = players.filter((p) => pickerSelected.includes(p.id));
    const label = pickerLabel.trim() || generateFunTeamName(chosen, families);
    setTeams((t) => [
      ...t,
      {
        id: nextId,
        name: label,
        playerIds: [...pickerSelected],
        score: 0,
        misses: 0,
        eliminated: false,
        stats: { ...EMPTY_STATS, scoreHistory: [] },
      },
    ]);
    setNextId((n) => n + 1);
    setPickerSelected([]);
    setPickerLabel("");
    setShowPlayerPicker(false);
  }

  function removeTeam(id) {
    setTeams((t) => t.filter((team) => team.id !== id));
    setSelections((s) => {
      const copy = { ...s };
      delete copy[id];
      return copy;
    });
  }

  function togglePin(teamId, pin) {
    setSelections((s) => {
      const current = s[teamId] || [];
      const updated = current.includes(pin)
        ? current.filter((p) => p !== pin)
        : [...current, pin];
      return { ...s, [teamId]: updated };
    });
  }

  function clearSelection(teamId) {
    setSelections((s) => ({ ...s, [teamId]: [] }));
  }

  function updatePlayerAndFamilyStats(updatedTeams) {
    setPlayerStats((prev) => {
      const next = { ...prev };
      updatedTeams.forEach((team) => {
        const isWinner = team.score === 50;
        const isSolo = (team.playerIds || []).length === 1;
        (team.playerIds || []).forEach((pid) => {
          const cur = next[pid] || { ...EMPTY_PLAYER_STATS };
          const entry = {
            ...cur,
            gamesPlayed: cur.gamesPlayed + 1,
            wins: cur.wins + (isWinner ? 1 : 0),
          };
          if (isSolo) {
            const acc = team.stats.throws
              ? Math.round((team.stats.hits / team.stats.throws) * 100)
              : 0;
            entry.soloGames = cur.soloGames + 1;
            entry.soloAccSum = cur.soloAccSum + acc;
            entry.soloAccCount = cur.soloAccCount + 1;
            entry.soloBestThrow = Math.max(cur.soloBestThrow, team.stats.bestThrow);
            entry.soloMisses = cur.soloMisses + team.stats.missesTotal;
            entry.soloBusts = cur.soloBusts + team.stats.bustCount;
          }
          next[pid] = entry;
        });
      });
      saveToStorage("molkky_player_stats", JSON.stringify(next));
      return next;
    });
  }

  function applyScore(id, pts, pinsCount) {
    if (gameOver) return;
    const team = teams.find((t) => t.id === id);
    if (!team || team.eliminated) return;

    pushHistory();

    let newStatus = "";
    let newGameOver = gameOver;
    const isMiss = pts === 0;

    const updated = teams.map((t) => {
      if (t.id !== id) return t;

      const newScoreRaw = t.score + pts;
      let score = t.score;
      let misses = t.misses;
      let eliminated = t.eliminated;
      let bustCount = t.stats.bustCount;
      let longestMissStreak = t.stats.longestMissStreak;

      if (newScoreRaw > 50) {
        score = 25;
        bustCount += 1;
        newStatus = `Dépassement de 50 ! ${t.name} redescend à 25 points.`;
      } else {
        score = newScoreRaw;
      }

      if (isMiss) {
        misses = t.misses + 1;
        longestMissStreak = Math.max(longestMissStreak, misses);
      } else {
        misses = 0;
      }

      if (score === 50) {
        newStatus = `${t.name} gagne avec 50 points !`;
        newGameOver = true;
      } else if (misses === 3 && !newGameOver) {
        eliminated = true;
        newStatus = `${t.name} est éliminée après 3 lancers ratés.`;
      }

      const throwsCount = t.stats.throws + 1;
      const hits = isMiss ? t.stats.hits : t.stats.hits + 1;
      const missesTotal = isMiss ? t.stats.missesTotal + 1 : t.stats.missesTotal;
      const bestThrow = !isMiss ? Math.max(t.stats.bestThrow, pts) : t.stats.bestThrow;
      let soloThrows = t.stats.soloThrows;
      let multiThrows = t.stats.multiThrows;
      let soloPoints = t.stats.soloPoints;
      let multiPoints = t.stats.multiPoints;
      if (!isMiss) {
        if (pinsCount === 1) {
          soloThrows += 1;
          soloPoints += pts;
        } else if (pinsCount > 1) {
          multiThrows += 1;
          multiPoints += pts;
        }
      }
      const scoreHistory = [...t.stats.scoreHistory, { score, ts: Date.now() }];

      return {
        ...t,
        score,
        misses,
        eliminated,
        stats: {
          ...t.stats,
          throws: throwsCount,
          hits,
          missesTotal,
          bestThrow,
          bustCount,
          longestMissStreak,
          soloThrows,
          multiThrows,
          soloPoints,
          multiPoints,
          scoreHistory,
        },
      };
    });

    setTeams(updated);
    setStatus(newStatus);
    setGameOver(newGameOver);

    if (newGameOver && !gameOver) {
      const summary = computeGameSummary(updated);
      if (summary) {
        setResultsSummary(summary);
        setShowResults(true);
        saveHistoryRecord(summary);
        updatePlayerAndFamilyStats(updated);
      }
    }
  }

  function validateThrow(teamId) {
    const selected = selections[teamId] || [];
    if (selected.length === 0) return;
    const pts = selected.length === 1 ? selected[0] : selected.length;
    applyScore(teamId, pts, selected.length);
    clearSelection(teamId);
  }

  function registerMiss(teamId) {
    clearSelection(teamId);
    applyScore(teamId, 0, 0);
  }

  function undo() {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setTeams(prev.teams);
    setGameOver(prev.gameOver);
    setStatus("");
    setHistory((h) => h.slice(0, -1));
  }

  function resetScores() {
    setTeams((t) =>
      t.map((team) => ({
        ...team,
        score: 0,
        misses: 0,
        eliminated: false,
        stats: { ...EMPTY_STATS, scoreHistory: [] },
      }))
    );
    setSelections({});
    setHistory([]);
    setGameOver(false);
    setStatus("");
    setShowResults(false);
    setResultsSummary(null);
  }

  function clearAll() {
    setTeams([]);
    setSelections({});
    setHistory([]);
    setGameOver(false);
    setStatus("");
    setShowResults(false);
    setResultsSummary(null);
  }

  const allTime = computeAllTimeStats(gameHistoryRecords);

  function computeFamilyStats() {
    const byFamily = {};
    families.forEach((f) => {
      byFamily[f.id] = {
        name: f.name,
        members: 0,
        gamesPlayed: 0,
        wins: 0,
        soloAccSum: 0,
        soloAccCount: 0,
      };
    });
    players.forEach((p) => {
      if (!byFamily[p.familyId]) return;
      byFamily[p.familyId].members += 1;
      const st = playerStats[p.id];
      if (st) {
        byFamily[p.familyId].gamesPlayed += st.gamesPlayed;
        byFamily[p.familyId].wins += st.wins;
        byFamily[p.familyId].soloAccSum += st.soloAccSum;
        byFamily[p.familyId].soloAccCount += st.soloAccCount;
      }
    });
    return byFamily;
  }

  function computeBestByRole() {
    const byRole = {};
    players.forEach((p) => {
      const st = playerStats[p.id];
      if (!st || st.gamesPlayed === 0) return;
      const winRate = Math.round((st.wins / st.gamesPlayed) * 100);
      const fam = families.find((f) => f.id === p.familyId);
      const entry = {
        name: p.firstName,
        family: fam ? fam.name : "",
        winRate,
        gamesPlayed: st.gamesPlayed,
      };
      if (!byRole[p.role] || entry.winRate > byRole[p.role].winRate) {
        byRole[p.role] = entry;
      }
    });
    return byRole;
  }

  const familyStatsComputed = computeFamilyStats();
  const bestByRole = computeBestByRole();
  const activeFamily = families.find((f) => f.id === activeFamilyId);
  const activeFamilyPlayers = players.filter((p) => p.familyId === activeFamilyId);

  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-800 to-emerald-950 text-white p-4 flex flex-col items-center">
      <div className="w-full max-w-lg flex items-center justify-between mb-1">
        <h1 className="text-2xl font-bold tracking-wide">Mölkky</h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowProfiles(true)}
            className="bg-white/15 hover:bg-white/25 rounded-lg p-2"
            title="Profils (familles & joueurs)"
          >
            <Users size={18} />
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="bg-white/15 hover:bg-white/25 rounded-lg p-2"
            title="Réglages des stats"
          >
            <Settings size={18} />
          </button>
          <button
            onClick={() => setShowResults(true)}
            className="bg-white/15 hover:bg-white/25 rounded-lg p-2"
            title="Voir les stats"
          >
            <BarChart3 size={18} />
          </button>
        </div>
      </div>
      <p className="text-xs text-white/60 mb-5 text-center max-w-md">
        Clique sur les quilles tombées lors du lancer, puis valide.
      </p>

      <div className="flex flex-col gap-2 w-full max-w-lg mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTeam()}
            placeholder="Équipe libre (ex: Invités)"
            maxLength={30}
            className="flex-1 rounded-lg px-3 py-2 text-gray-900 outline-none"
          />
          <button
            onClick={addTeam}
            className="bg-emerald-600 hover:bg-emerald-500 rounded-lg px-4 py-2 font-bold flex items-center gap-1"
          >
            <Plus size={18} />
          </button>
        </div>
        <button
          onClick={() => setShowPlayerPicker(true)}
          className="bg-white/15 hover:bg-white/25 rounded-lg px-3 py-2 text-sm flex items-center justify-center gap-1.5"
        >
          <UserPlus size={16} /> Créer une équipe depuis les profils
        </button>
      </div>

      {teams.length === 0 && (
        <p className="opacity-70 mt-8">
          Ajoute au moins une équipe pour commencer.
        </p>
      )}

      <div className="flex flex-wrap gap-5 justify-center max-w-5xl w-full">
        {teams.map((team) => {
          const selected = selections[team.id] || [];
          const pendingTotal =
            selected.length === 1 ? selected[0] : selected.length;
          const disabled = gameOver || team.eliminated;

          return (
            <div
              key={team.id}
              className={`relative rounded-2xl p-4 w-72 text-center border-2 ${
                team.score === 50
                  ? "bg-yellow-400/20 border-yellow-400"
                  : "bg-black/20 border-white/10"
              } ${team.eliminated ? "opacity-40" : ""}`}
            >
              <button
                onClick={() => removeTeam(team.id)}
                className="absolute top-2 right-2 text-white/60 hover:text-white"
                title="Supprimer cette équipe"
              >
                <X size={18} />
              </button>

              <div className="font-bold text-lg mb-1 break-words">
                {team.name}
              </div>
              <div className="text-5xl font-bold mb-1">{team.score}</div>

              <div className="flex items-center justify-center gap-1.5 mb-2 text-xs text-white/70">
                <span>Ratés :</span>
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className={`w-2.5 h-2.5 rounded-full ${
                        i < team.misses ? "bg-red-500" : "bg-white/20"
                      }`}
                    />
                  ))}
                </div>
                <span className="font-semibold">{team.misses}/3</span>
              </div>

              <div className="text-sm mb-2 h-5 text-emerald-300">
                {selected.length === 1 &&
                  `Quille ${selected[0]} tombée = ${pendingTotal} pt`}
                {selected.length > 1 &&
                  `${selected.length} quilles tombées (${selected
                    .slice()
                    .sort((a, b) => a - b)
                    .join(", ")}) = ${pendingTotal} pts`}
              </div>

              <div
                className="rounded-xl p-3 mb-3"
                style={{
                  background:
                    "radial-gradient(ellipse at center, #3f8555 0%, #2f6b42 70%, #285c39 100%)",
                }}
              >
                <div className="flex flex-col items-center gap-1.5">
                  {ROWS.map((row, i) => (
                    <div key={i} className="flex gap-1.5 justify-center">
                      {row.map((pin) => (
                        <Pin
                          key={pin}
                          number={pin}
                          isDown={selected.includes(pin)}
                          disabled={disabled}
                          onClick={() => togglePin(team.id, pin)}
                        />
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-1.5">
                <button
                  onClick={() => validateThrow(team.id)}
                  disabled={disabled || selected.length === 0}
                  className="flex-1 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-30 disabled:cursor-not-allowed rounded-md py-2 font-bold text-sm flex items-center justify-center gap-1"
                >
                  <Check size={16} /> Valider
                </button>
                <button
                  onClick={() => clearSelection(team.id)}
                  disabled={disabled || selected.length === 0}
                  className="bg-white/20 hover:bg-white/30 disabled:opacity-30 disabled:cursor-not-allowed rounded-md px-3 py-2 text-sm"
                >
                  Effacer
                </button>
              </div>

              <button
                onClick={() => registerMiss(team.id)}
                disabled={disabled}
                className="mt-1.5 w-full bg-red-700 hover:bg-red-600 disabled:opacity-40 disabled:cursor-not-allowed rounded-md py-2 font-bold text-sm"
              >
                Raté (0 pt)
              </button>
            </div>
          );
        })}
      </div>

      <div className="min-h-6 mt-5 font-bold text-yellow-400 text-center max-w-lg">
        {status}
      </div>

      <div className="flex gap-3 mt-6 flex-wrap justify-center">
        <button
          onClick={undo}
          className="bg-white/20 hover:bg-white/30 rounded-lg px-4 py-2 flex items-center gap-1.5"
        >
          <Undo2 size={16} /> Annuler
        </button>
        <button
          onClick={resetScores}
          className="bg-white/20 hover:bg-white/30 rounded-lg px-4 py-2 flex items-center gap-1.5"
        >
          <RotateCcw size={16} /> Nouvelle partie
        </button>
        <button
          onClick={clearAll}
          className="bg-white/20 hover:bg-white/30 rounded-lg px-4 py-2 flex items-center gap-1.5"
        >
          <Trash2 size={16} /> Tout effacer
        </button>
      </div>

      {/* --- Panneau Profils : familles & joueurs --- */}
      {showProfiles && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-emerald-950 border border-white/15 rounded-2xl p-5 w-full max-w-md max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Users size={18} /> Profils
              </h2>
              <button onClick={() => setShowProfiles(false)}>
                <X size={20} />
              </button>
            </div>

            {!activeFamily ? (
              <>
                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    value={newFamilyName}
                    onChange={(e) => setNewFamilyName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addFamily()}
                    placeholder="Nom de famille (ex: Dupont)"
                    className="flex-1 rounded-lg px-3 py-2 text-gray-900 outline-none text-sm"
                  />
                  <button
                    onClick={addFamily}
                    className="bg-emerald-600 hover:bg-emerald-500 rounded-lg px-3 py-2"
                  >
                    <Plus size={18} />
                  </button>
                </div>

                {families.length === 0 && (
                  <p className="text-sm text-white/60">
                    Crée une première famille pour commencer à ajouter des joueurs.
                  </p>
                )}

                <div className="flex flex-col gap-2">
                  {families.map((f) => {
                    const memberCount = players.filter((p) => p.familyId === f.id).length;
                    return (
                      <div
                        key={f.id}
                        className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2"
                      >
                        <button
                          onClick={() => setActiveFamilyId(f.id)}
                          className="flex-1 text-left flex items-center justify-between"
                        >
                          <span className="font-semibold">👨‍👩‍👧‍👦 Famille {f.name}</span>
                          <span className="text-xs text-white/60 flex items-center gap-1">
                            {memberCount} membre{memberCount > 1 ? "s" : ""}
                            <ChevronRight size={14} />
                          </span>
                        </button>
                        <button
                          onClick={() => removeFamily(f.id)}
                          className="ml-2 text-white/50 hover:text-red-400"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <>
                <button
                  onClick={() => setActiveFamilyId(null)}
                  className="flex items-center gap-1 text-sm text-white/70 mb-3"
                >
                  <ChevronLeft size={16} /> Toutes les familles
                </button>
                <h3 className="font-bold mb-3">👨‍👩‍👧‍👦 Famille {activeFamily.name}</h3>

                <div className="flex flex-col gap-2 mb-4">
                  {activeFamilyPlayers.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2 text-sm"
                    >
                      <div>
                        <div className="font-semibold">
                          {p.sex === "F" ? "♀" : "♂"} {p.firstName} {activeFamily.name}
                        </div>
                        <div className="text-white/60 text-xs">
                          {p.role} · {p.age ? `${p.age} ans` : "âge non précisé"}
                        </div>
                      </div>
                      <button
                        onClick={() => removePlayer(p.id)}
                        className="text-white/50 hover:text-red-400"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}
                  {activeFamilyPlayers.length === 0 && (
                    <p className="text-sm text-white/60">Aucun joueur pour l'instant.</p>
                  )}
                </div>

                <div className="bg-white/5 rounded-lg p-3">
                  <div className="text-xs uppercase tracking-wide text-white/50 mb-2">
                    Ajouter un joueur
                  </div>
                  <input
                    type="text"
                    value={newPlayerDraft.firstName}
                    onChange={(e) =>
                      setNewPlayerDraft((d) => ({ ...d, firstName: e.target.value }))
                    }
                    placeholder="Prénom"
                    className="w-full rounded-lg px-3 py-2 text-gray-900 outline-none text-sm mb-2"
                  />
                  <div className="flex gap-2 mb-2">
                    <select
                      value={newPlayerDraft.sex}
                      onChange={(e) =>
                        setNewPlayerDraft((d) => ({ ...d, sex: e.target.value }))
                      }
                      className="flex-1 rounded-lg px-2 py-2 text-gray-900 text-sm"
                    >
                      <option value="H">Homme</option>
                      <option value="F">Femme</option>
                    </select>
                    <input
                      type="number"
                      value={newPlayerDraft.age}
                      onChange={(e) =>
                        setNewPlayerDraft((d) => ({ ...d, age: e.target.value }))
                      }
                      placeholder="Âge"
                      className="w-20 rounded-lg px-2 py-2 text-gray-900 text-sm"
                    />
                  </div>
                  <select
                    value={newPlayerDraft.role}
                    onChange={(e) =>
                      setNewPlayerDraft((d) => ({ ...d, role: e.target.value }))
                    }
                    className="w-full rounded-lg px-2 py-2 text-gray-900 text-sm mb-2"
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={addPlayer}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 rounded-lg py-2 font-bold text-sm flex items-center justify-center gap-1.5"
                  >
                    <UserPlus size={16} /> Ajouter à la famille
                  </button>
                </div>
              </>
            )}

            <div className="mt-4 bg-white/5 rounded-lg p-3">
              <div className="text-xs uppercase tracking-wide text-white/50 mb-2">
                Sauvegarde
              </div>
              <button
                onClick={saveNow}
                className="w-full bg-emerald-600 hover:bg-emerald-500 rounded-lg py-2 font-bold text-sm mb-2 flex items-center justify-center gap-1.5"
              >
                <Save size={16} /> Sauvegarder maintenant
              </button>
              {saveMsg && (
                <p className="text-xs text-emerald-300 text-center mb-2">{saveMsg}</p>
              )}
              <button
                onClick={() => setShowBackup((v) => !v)}
                className="w-full bg-white/15 hover:bg-white/25 rounded-lg py-2 text-sm"
              >
                {showBackup ? "Masquer la sauvegarde texte" : "Exporter / restaurer en texte"}
              </button>
              {showBackup && (
                <>
                  <p className="text-xs text-white/50 mt-2 mb-1">
                    Sélectionne tout ce texte et copie-le quelque part en sécurité (notes, mail...) :
                  </p>
                  <textarea
                    readOnly
                    value={buildBackupString()}
                    onFocus={(e) => e.target.select()}
                    className="w-full h-24 rounded-lg p-2 text-xs text-gray-900"
                  />
                  <p className="text-xs text-white/50 mt-2 mb-1">
                    Pour restaurer une sauvegarde, colle-la ici puis appuie sur "Restaurer" :
                  </p>
                  <textarea
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                    placeholder="Colle ici un backup copié précédemment"
                    className="w-full h-20 rounded-lg p-2 text-xs text-gray-900"
                  />
                  <button
                    onClick={restoreFromBackup}
                    disabled={!importText.trim()}
                    className="w-full bg-yellow-600 hover:bg-yellow-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg py-2 text-sm font-bold mt-2"
                  >
                    Restaurer depuis ce texte
                  </button>
                </>
              )}
            </div>

            <button
              onClick={() => setShowProfiles(false)}
              className="mt-4 w-full bg-white/20 hover:bg-white/30 rounded-lg py-2 font-bold"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* --- Sélecteur de joueurs pour créer une équipe --- */}
      {showPlayerPicker && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-emerald-950 border border-white/15 rounded-2xl p-5 w-full max-w-md max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <UserPlus size={18} /> Choisir les joueurs
              </h2>
              <button onClick={() => setShowPlayerPicker(false)}>
                <X size={20} />
              </button>
            </div>

            {families.length === 0 ? (
              <p className="text-sm text-white/60">
                Aucune famille créée. Ouvre "Profils" pour en créer une d'abord.
              </p>
            ) : (
              <div className="flex flex-col gap-3 mb-4">
                {families.map((f) => {
                  const famPlayers = players.filter((p) => p.familyId === f.id);
                  if (famPlayers.length === 0) return null;
                  return (
                    <div key={f.id}>
                      <div className="text-xs uppercase tracking-wide text-white/50 mb-1">
                        Famille {f.name}
                      </div>
                      <div className="flex flex-col gap-1">
                        {famPlayers.map((p) => (
                          <label
                            key={p.id}
                            className="flex items-center gap-2 py-1 text-sm cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={pickerSelected.includes(p.id)}
                              onChange={() => togglePickerPlayer(p.id)}
                              className="w-4 h-4"
                            />
                            <span>
                              {p.sex === "F" ? "♀" : "♂"} {p.firstName} {f.name} ({p.role})
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <input
              type="text"
              value={pickerLabel}
              onChange={(e) => setPickerLabel(e.target.value)}
              placeholder="Nom de l'équipe (optionnel, sinon auto)"
              className="w-full rounded-lg px-3 py-2 text-gray-900 outline-none text-sm mb-3"
            />

            <button
              onClick={createTeamFromPlayers}
              disabled={pickerSelected.length === 0}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg py-2 font-bold"
            >
              Créer l'équipe ({pickerSelected.length} joueur{pickerSelected.length > 1 ? "s" : ""})
            </button>
          </div>
        </div>
      )}

      {/* --- Panneau de réglages des stats --- */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-emerald-950 border border-white/15 rounded-2xl p-5 w-full max-w-md max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Settings size={18} /> Stats à afficher
              </h2>
              <button onClick={() => setShowSettings(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="text-xs uppercase tracking-wide text-white/50 mb-2">
              Stats de la partie
            </div>
            {["precision", "sniper", "kamikaze", "glacon", "marathon", "soloMulti", "clutch", "comeback"].map(
              (key) => (
                <label key={key} className="flex items-center gap-2 py-1.5 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={statsSettings[key]}
                    onChange={() => toggleSetting(key)}
                    className="w-4 h-4"
                  />
                  <span>
                    {STAT_LABELS[key].emoji} {STAT_LABELS[key].label}
                  </span>
                </label>
              )
            )}

            <div className="text-xs uppercase tracking-wide text-white/50 mt-4 mb-2">
              Stats historiques (entre les parties)
            </div>
            {["classement", "moyennePrecision", "roi50", "malediction25", "rapide", "marathonien", "serie", "recordPrecision"].map(
              (key) => (
                <label key={key} className="flex items-center gap-2 py-1.5 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={statsSettings[key]}
                    onChange={() => toggleSetting(key)}
                    className="w-4 h-4"
                  />
                  <span>
                    {STAT_LABELS[key].emoji} {STAT_LABELS[key].label}
                  </span>
                </label>
              )
            )}

            <div className="text-xs uppercase tracking-wide text-white/50 mt-4 mb-2">
              Stats profils (joueurs & familles)
            </div>
            {["playerStats", "familyStats", "rolesFun"].map((key) => (
              <label key={key} className="flex items-center gap-2 py-1.5 cursor-pointer text-sm">
                <input
                  type="checkbox"
                  checked={statsSettings[key]}
                  onChange={() => toggleSetting(key)}
                  className="w-4 h-4"
                />
                <span>
                  {STAT_LABELS[key].emoji} {STAT_LABELS[key].label}
                </span>
              </label>
            ))}

            <button
              onClick={() => setShowSettings(false)}
              className="mt-4 w-full bg-emerald-600 hover:bg-emerald-500 rounded-lg py-2 font-bold"
            >
              Fermer
            </button>
          </div>
        </div>
      )}

      {/* --- Écran de résultats / stats --- */}
      {showResults && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
          <div className="bg-emerald-950 border border-white/15 rounded-2xl p-5 w-full max-w-lg max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Trophy size={18} className="text-yellow-400" /> Résultats
              </h2>
              <button onClick={() => setShowResults(false)}>
                <X size={20} />
              </button>
            </div>

            {resultsSummary ? (
              <div className="mb-5">
                <div className="text-center mb-4">
                  <div className="text-sm text-white/60">Vainqueur</div>
                  <div className="text-2xl font-extrabold text-yellow-400">
                    {resultsSummary.winner}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2 text-sm">
                  {statsSettings.precision &&
                    resultsSummary.teams.map((t) => (
                      <div key={t.name} className="flex justify-between bg-white/5 rounded-lg px-3 py-2">
                        <span>🎯 Précision {t.name}</span>
                        <span className="font-bold">
                          {t.accuracy}% ({t.hits}/{t.throws})
                        </span>
                      </div>
                    ))}

                  {statsSettings.sniper && (
                    <div className="flex justify-between bg-white/5 rounded-lg px-3 py-2">
                      <span>🔥 Le Sniper</span>
                      <span className="font-bold">
                        {resultsSummary.sniper.name} ({resultsSummary.sniper.value} pts en 1 lancer)
                      </span>
                    </div>
                  )}

                  {statsSettings.kamikaze && resultsSummary.kamikaze.value > 0 && (
                    <div className="flex justify-between bg-white/5 rounded-lg px-3 py-2">
                      <span>💥 Le Kamikaze</span>
                      <span className="font-bold">
                        {resultsSummary.kamikaze.name} ({resultsSummary.kamikaze.value}x &gt; 50)
                      </span>
                    </div>
                  )}

                  {statsSettings.glacon && resultsSummary.glacon.value > 0 && (
                    <div className="flex justify-between bg-white/5 rounded-lg px-3 py-2">
                      <span>🧊 Le Glaçon</span>
                      <span className="font-bold">
                        {resultsSummary.glacon.name} ({resultsSummary.glacon.value} ratés d'affilée)
                      </span>
                    </div>
                  )}

                  {statsSettings.marathon && (
                    <div className="flex justify-between bg-white/5 rounded-lg px-3 py-2">
                      <span>🐌 Le Marathon</span>
                      <span className="font-bold">{resultsSummary.totalThrows} lancers au total</span>
                    </div>
                  )}

                  {statsSettings.soloMulti &&
                    resultsSummary.teams.map((t) => (
                      <div key={"sm-" + t.name} className="flex justify-between bg-white/5 rounded-lg px-3 py-2">
                        <span>🎲 {t.name}</span>
                        <span className="font-bold text-right">
                          {t.soloThrows} solo / {t.multiThrows} multi
                          <br />
                          <span className="font-normal text-white/60">
                            {t.totalPinsDown} quilles renversées
                          </span>
                        </span>
                      </div>
                    ))}

                  {statsSettings.clutch && (
                    <div className="flex justify-between bg-white/5 rounded-lg px-3 py-2">
                      <span>⚡ Le Clutch</span>
                      <span className="font-bold">
                        {resultsSummary.clutch.isClutch
                          ? `Victoire serrée (${resultsSummary.clutch.preWinScore} pts avant le lancer final)`
                          : "Victoire large"}
                      </span>
                    </div>
                  )}

                  {statsSettings.comeback && resultsSummary.comeback > 0 && (
                    <div className="flex justify-between bg-white/5 rounded-lg px-3 py-2">
                      <span>😮‍💨 Le Grand Retour</span>
                      <span className="font-bold">
                        {resultsSummary.winner} a comblé {resultsSummary.comeback} pts de retard
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-sm text-white/60 mb-5">
                Termine une partie pour voir les stats de la manche ici.
              </p>
            )}

            {gameHistoryRecords.length > 0 && (
              <div className="mb-4">
                <div className="text-xs uppercase tracking-wide text-white/50 mb-2 mt-2">
                  Historique ({gameHistoryRecords.length} partie{gameHistoryRecords.length > 1 ? "s" : ""})
                </div>
                <div className="grid grid-cols-1 gap-2 text-sm">
                  {statsSettings.classement && (
                    <div className="bg-white/5 rounded-lg px-3 py-2">
                      <div className="mb-1">🏆 Classement général</div>
                      {Object.entries(allTime.winsByName)
                        .sort((a, b) => b[1] - a[1])
                        .map(([name, wins]) => (
                          <div key={name} className="flex justify-between text-white/80">
                            <span>{name}</span>
                            <span className="font-bold">{wins} victoire{wins > 1 ? "s" : ""}</span>
                          </div>
                        ))}
                    </div>
                  )}

                  {statsSettings.moyennePrecision && (
                    <div className="bg-white/5 rounded-lg px-3 py-2">
                      <div className="mb-1">📊 Précision moyenne</div>
                      {Object.entries(allTime.accByName).map(([name, v]) => (
                        <div key={name} className="flex justify-between text-white/80">
                          <span>{name}</span>
                          <span className="font-bold">{Math.round(v.sum / v.count)}%</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {statsSettings.roi50 && Object.keys(allTime.roi50ByName).length > 0 && (
                    <div className="bg-white/5 rounded-lg px-3 py-2">
                      <div className="mb-1">👑 Le Roi du 50 (jamais dépassé)</div>
                      {Object.entries(allTime.roi50ByName)
                        .sort((a, b) => b[1] - a[1])
                        .map(([name, count]) => (
                          <div key={name} className="flex justify-between text-white/80">
                            <span>{name}</span>
                            <span className="font-bold">{count}x</span>
                          </div>
                        ))}
                    </div>
                  )}

                  {statsSettings.malediction25 && (
                    <div className="bg-white/5 rounded-lg px-3 py-2">
                      <div className="mb-1">☠️ La Malédiction du 25 (cumulé)</div>
                      {Object.entries(allTime.bustByName)
                        .filter(([, c]) => c > 0)
                        .sort((a, b) => b[1] - a[1])
                        .map(([name, count]) => (
                          <div key={name} className="flex justify-between text-white/80">
                            <span>{name}</span>
                            <span className="font-bold">{count}x</span>
                          </div>
                        ))}
                    </div>
                  )}

                  {statsSettings.rapide && allTime.fastest && (
                    <div className="flex justify-between bg-white/5 rounded-lg px-3 py-2">
                      <span>⏱️ Partie la plus rapide</span>
                      <span className="font-bold">
                        {allTime.fastest.totalThrows} lancers ({allTime.fastest.winner})
                      </span>
                    </div>
                  )}

                  {statsSettings.marathonien && allTime.longest && (
                    <div className="flex justify-between bg-white/5 rounded-lg px-3 py-2">
                      <span>🐢 Partie la plus longue</span>
                      <span className="font-bold">
                        {allTime.longest.totalThrows} lancers ({allTime.longest.winner})
                      </span>
                    </div>
                  )}

                  {statsSettings.serie && allTime.currentStreak.count > 1 && (
                    <div className="flex justify-between bg-white/5 rounded-lg px-3 py-2">
                      <span>🔄 Série en cours</span>
                      <span className="font-bold">
                        {allTime.currentStreak.name} ({allTime.currentStreak.count} victoires)
                      </span>
                    </div>
                  )}

                  {statsSettings.recordPrecision && allTime.bestAcc && (
                    <div className="flex justify-between bg-white/5 rounded-lg px-3 py-2">
                      <span>🌟 Meilleure précision jamais vue</span>
                      <span className="font-bold">
                        {allTime.bestAcc.name} ({allTime.bestAcc.accuracy}%)
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {players.length > 0 && (
              <div className="mb-4">
                <div className="text-xs uppercase tracking-wide text-white/50 mb-2 mt-2">
                  Profils
                </div>
                <div className="grid grid-cols-1 gap-2 text-sm">
                  {statsSettings.playerStats && (
                    <div className="bg-white/5 rounded-lg px-3 py-2">
                      <div className="mb-1">👤 Stats individuelles</div>
                      {players
                        .filter((p) => playerStats[p.id] && playerStats[p.id].gamesPlayed > 0)
                        .sort((a, b) => (playerStats[b.id].wins || 0) - (playerStats[a.id].wins || 0))
                        .map((p) => {
                          const st = playerStats[p.id];
                          const fam = families.find((f) => f.id === p.familyId);
                          const soloAcc = st.soloAccCount
                            ? Math.round(st.soloAccSum / st.soloAccCount)
                            : null;
                          return (
                            <div key={p.id} className="flex justify-between text-white/80 py-0.5">
                              <span>
                                {p.sex === "F" ? "♀" : "♂"} {p.firstName} {fam ? fam.name : ""}
                              </span>
                              <span className="font-bold text-right">
                                {st.wins}/{st.gamesPlayed} victoires
                                {soloAcc !== null && (
                                  <span className="font-normal text-white/60"> · {soloAcc}% précision solo</span>
                                )}
                              </span>
                            </div>
                          );
                        })}
                      {players.every((p) => !playerStats[p.id] || playerStats[p.id].gamesPlayed === 0) && (
                        <p className="text-white/50 text-xs">
                          Crée des équipes depuis les profils pour commencer à accumuler des stats.
                        </p>
                      )}
                    </div>
                  )}

                  {statsSettings.familyStats && families.length > 0 && (
                    <div className="bg-white/5 rounded-lg px-3 py-2">
                      <div className="mb-1">👨‍👩‍👧‍👦 Stats par famille</div>
                      {Object.values(familyStatsComputed)
                        .filter((f) => f.gamesPlayed > 0)
                        .sort((a, b) => b.wins - a.wins)
                        .map((f) => (
                          <div key={f.name} className="flex justify-between text-white/80 py-0.5">
                            <span>Famille {f.name}</span>
                            <span className="font-bold text-right">
                              {f.wins}/{f.gamesPlayed} victoires
                              {f.soloAccCount > 0 && (
                                <span className="font-normal text-white/60">
                                  {" "}
                                  · {Math.round(f.soloAccSum / f.soloAccCount)}% précision
                                </span>
                              )}
                            </span>
                          </div>
                        ))}
                      {Object.values(familyStatsComputed).every((f) => f.gamesPlayed === 0) && (
                        <p className="text-white/50 text-xs">Pas encore de partie jouée en famille.</p>
                      )}
                    </div>
                  )}

                  {statsSettings.rolesFun && Object.keys(bestByRole).length > 0 && (
                    <div className="bg-white/5 rounded-lg px-3 py-2">
                      <div className="mb-1">🏅 Meilleur par rôle</div>
                      {Object.entries(bestByRole).map(([role, entry]) => (
                        <div key={role} className="flex justify-between text-white/80 py-0.5">
                          <span>{role}</span>
                          <span className="font-bold">
                            {entry.name} {entry.family} ({entry.winRate}%)
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setShowResults(false)}
                className="flex-1 bg-white/20 hover:bg-white/30 rounded-lg py-2 font-bold"
              >
                Fermer
              </button>
              {gameOver && (
                <button
                  onClick={resetScores}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 rounded-lg py-2 font-bold"
                >
                  Nouvelle partie
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
