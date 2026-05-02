import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { colors, isSmall, width } from '../theme';

type GameType = 'math' | 'scramble' | 'memory' | 'tap';

type DistractionGame = {
  title: string;
  type: GameType;
  subtitle: string;
  icon: string;
};

type MathQuestion = {
  prompt: string;
  answer: number;
  options: number[];
};

type MemoryCard = {
  id: string;
  value: string;
  matched: boolean;
};

type PanicGamesScreenProps = {
  onBack: () => void;
  distractionGames: DistractionGame[];
};

const tapBoardWidth = Math.min(width - 64, 360);
const tapBoardHeight = 280;
const tapTargetSize = 58;

const scrambleWords = [
  'DISCIPLINE',
  'FOCUS',
  'FREEDOM',
  'CONTROL',
  'CLARITY',
  'RESET',
  'COURAGE',
  'STRENGTH',
  'PURPOSE',
  'PATIENCE',
  'RESOLVE',
  'GROWTH',
  'VICTORY',
  'COMMIT',
  'BREATHE',
  'HONESTY',
  'ROUTINE',
  'MINDSET',
  'PROGRESS',
  'RECOVERY',
  'BOUNDARY',
  'CONFIDENCE',
  'ENERGY',
  'BALANCE',
];
const memorySymbols = ['⚡', '🌱', '🛡️', '🔥', '🎯', '💎', '🏆', '🧠'];

function shuffle<T>(items: T[]): T[] {
  return [...items].sort(() => Math.random() - 0.5);
}

function buildMathQuestion(round: number): MathQuestion {
  const a = Math.floor(Math.random() * 10) + 4 + round;
  const b = Math.floor(Math.random() * 8) + 2;
  const operator = round % 3;
  const answer = operator === 0 ? a + b : operator === 1 ? a - b : a * b;
  const symbol = operator === 0 ? '+' : operator === 1 ? '-' : '×';
  const options = shuffle([answer, answer + 2, answer - 3, answer + 5]).filter((item, index, list) => list.indexOf(item) === index);
  while (options.length < 4) options.push(answer + options.length + 6);
  return {
    prompt: `${a} ${symbol} ${b}`,
    answer,
    options: shuffle(options),
  };
}

function scrambleWord(word: string): string {
  const letters = word.split('');
  const shuffled = shuffle(letters);
  const result = shuffled.join('');
  return result === word ? `${result.slice(1)}${result[0]}` : result;
}

function buildScrambleRound(sessionWords: string[], round: number) {
  const word = sessionWords[round % sessionWords.length];
  const distractors = shuffle(scrambleWords.filter((item) => item !== word)).slice(0, 3);
  return {
    word,
    scrambled: scrambleWord(word),
    options: shuffle([word, ...distractors]),
  };
}

function buildMemoryCards(): MemoryCard[] {
  return shuffle([...memorySymbols, ...memorySymbols]).map((value, index) => ({
    id: `${value}-${index}-${Date.now()}`,
    value,
    matched: false,
  }));
}

function buildTargetPosition(hitCount: number) {
  const maxX = tapBoardWidth - tapTargetSize - 12;
  const maxY = tapBoardHeight - tapTargetSize - 12;
  return {
    x: 6 + Math.floor(Math.random() * Math.max(1, maxX)),
    y: 6 + Math.floor(Math.random() * Math.max(1, maxY)),
    label: `${hitCount + 1}`,
  };
}

function animateScale(scale: Animated.Value, toValue: number) {
  Animated.spring(scale, {
    toValue,
    friction: 5,
    tension: 190,
    useNativeDriver: true,
  }).start();
}

export function PanicGamesScreen({ onBack, distractionGames }: PanicGamesScreenProps) {
  const [selectedGame, setSelectedGame] = useState<GameType | null>(null);
  const [completeTitle, setCompleteTitle] = useState<string | null>(null);
  const backButtonScale = useRef(new Animated.Value(1)).current;
  const playAgainScale = useRef(new Animated.Value(1)).current;
  const chooseAnotherScale = useRef(new Animated.Value(1)).current;
  const pickerScales = useRef<Record<GameType, Animated.Value>>({
    math: new Animated.Value(1),
    scramble: new Animated.Value(1),
    memory: new Animated.Value(1),
    tap: new Animated.Value(1),
  }).current;

  function handleWin(title: string) {
    setCompleteTitle(title);
    setSelectedGame(null);
  }

  function resetPicker() {
    setCompleteTitle(null);
    setSelectedGame(null);
  }

  if (completeTitle) {
    return (
      <View style={styles.gamesOverlay}>
        <ScrollView contentContainerStyle={styles.screen} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Challenge won</Text>
          <View style={styles.gameCompleteCard}>
            <Text style={styles.gameCompleteIcon}>+50</Text>
            <Text style={styles.gameCompleteTitle}>{completeTitle} complete</Text>
            <Text style={styles.gameCompleteText}>You interrupted the urge loop. Choose another game if you still feel pressure.</Text>
          </View>
          <Pressable onPress={resetPicker} onPressIn={() => animateScale(playAgainScale, 0.96)} onPressOut={() => animateScale(playAgainScale, 1)}>
            <Animated.View style={[styles.playAgainButton, { transform: [{ scale: playAgainScale }] }]}>
              <Text style={styles.playAgainText}>Play another game</Text>
            </Animated.View>
          </Pressable>
          <BackButton scale={backButtonScale} onBack={onBack} />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.gamesOverlay}>
      <ScrollView contentContainerStyle={styles.screen} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>{selectedGame ? 'Stay locked in' : 'Pick a challenge'}</Text>
        <Text style={styles.subtitle}>{selectedGame ? 'Finish the round before you go back.' : 'These are active games, not instructions.'}</Text>

        {!selectedGame ? (
          <View style={styles.gamePickerGrid}>
            {distractionGames.map((game) => (
              <Pressable
                key={game.type}
                onPress={() => setSelectedGame(game.type)}
                onPressIn={() => animateScale(pickerScales[game.type], 0.96)}
                onPressOut={() => animateScale(pickerScales[game.type], 1)}
              >
                <Animated.View style={[styles.gameModeButton, { transform: [{ scale: pickerScales[game.type] }] }]}>
                  <Text style={styles.gameModeIcon}>{game.icon}</Text>
                  <Text style={styles.gameModeTitle}>{game.title}</Text>
                  <Text style={styles.gameModeSubtitle}>{game.subtitle}</Text>
                </Animated.View>
              </Pressable>
            ))}
          </View>
        ) : null}

        {selectedGame === 'math' ? <MathQuiz onWin={() => handleWin('Math Quiz')} /> : null}
        {selectedGame === 'scramble' ? <WordScramble onWin={() => handleWin('Word Scramble')} /> : null}
        {selectedGame === 'memory' ? <MemoryMatch onWin={() => handleWin('Memory Match')} /> : null}
        {selectedGame === 'tap' ? <TapTarget onWin={() => handleWin('Tap Target')} /> : null}

        {selectedGame ? (
          <Pressable onPress={() => setSelectedGame(null)} onPressIn={() => animateScale(chooseAnotherScale, 0.96)} onPressOut={() => animateScale(chooseAnotherScale, 1)}>
            <Animated.View style={[styles.chooseAnotherButton, { transform: [{ scale: chooseAnotherScale }] }]}>
              <Text style={styles.chooseAnotherText}>Choose another game</Text>
            </Animated.View>
          </Pressable>
        ) : null}

        <BackButton scale={backButtonScale} onBack={onBack} />
      </ScrollView>
    </View>
  );
}

function MathQuiz({ onWin }: { onWin: () => void }) {
  const [round, setRound] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [question, setQuestion] = useState<MathQuestion>(() => buildMathQuestion(0));

  function handleAnswer(answer: number) {
    if (picked !== null) return;
    setPicked(answer);
    if (answer !== question.answer) {
      setTimeout(() => setPicked(null), 450);
      return;
    }

    const nextScore = score + 1;
    setScore(nextScore);
    setTimeout(() => {
      if (round >= 4) {
        onWin();
        return;
      }
      const nextRound = round + 1;
      setRound(nextRound);
      setPicked(null);
      setQuestion(buildMathQuestion(nextRound));
    }, 450);
  }

  return (
    <View style={styles.card}>
      <View style={styles.gameHeaderRow}>
        <Text style={styles.sectionTitle}>Math Quiz</Text>
        <Text style={styles.progressPill}>{score}/5</Text>
      </View>
      <Text style={styles.taskText}>Solve 5 equations. Wrong taps do not advance.</Text>
      <View style={styles.gameQuestionPanel}>
        <Text style={styles.roundText}>Round {round + 1}</Text>
        <Text style={styles.challengeQuestion}>{question.prompt} = ?</Text>
      </View>
      <View style={styles.answerGrid}>
        {question.options.map((answer) => {
          const isPicked = picked === answer;
          const isCorrect = answer === question.answer;
          return (
            <Pressable key={answer} style={[styles.answerButton, isPicked && isCorrect ? styles.answerButtonCorrect : null, isPicked && !isCorrect ? styles.answerButtonWrong : null]} onPress={() => handleAnswer(answer)}>
              <Text style={styles.answerText}>{answer}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function WordScramble({ onWin }: { onWin: () => void }) {
  const [sessionWords] = useState(() => shuffle(scrambleWords).slice(0, 3));
  const [round, setRound] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [current, setCurrent] = useState(() => buildScrambleRound(sessionWords, 0));

  function handlePick(word: string) {
    if (picked) return;
    setPicked(word);
    if (word !== current.word) {
      setTimeout(() => setPicked(null), 450);
      return;
    }
    setTimeout(() => {
      if (round >= 2) {
        onWin();
        return;
      }
      const nextRound = round + 1;
      setRound(nextRound);
      setPicked(null);
      setCurrent(buildScrambleRound(sessionWords, nextRound));
    }, 450);
  }

  return (
    <View style={styles.card}>
      <View style={styles.gameHeaderRow}>
        <Text style={styles.sectionTitle}>Word Scramble</Text>
        <Text style={styles.progressPill}>{round + 1}/3</Text>
      </View>
      <Text style={styles.taskText}>Unscramble the recovery word.</Text>
      <View style={styles.gameQuestionPanel}>
        <Text style={styles.scrambleText}>{current.scrambled}</Text>
      </View>
      <View style={styles.answerGrid}>
        {current.options.map((word) => {
          const isPicked = picked === word;
          const isCorrect = word === current.word;
          return (
            <Pressable key={word} style={[styles.answerButton, isPicked && isCorrect ? styles.answerButtonCorrect : null, isPicked && !isCorrect ? styles.answerButtonWrong : null]} onPress={() => handlePick(word)}>
              <Text style={styles.answerText}>{word}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function MemoryMatch({ onWin }: { onWin: () => void }) {
  const [cards, setCards] = useState<MemoryCard[]>(() => buildMemoryCards());
  const [openIds, setOpenIds] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const matchedCount = cards.filter((card) => card.matched).length;

  function handleCard(card: MemoryCard) {
    if (busy || card.matched || openIds.includes(card.id)) return;
    const nextOpenIds = [...openIds, card.id];
    setOpenIds(nextOpenIds);
    if (nextOpenIds.length < 2) return;

    setBusy(true);
    const [first, second] = nextOpenIds.map((id) => cards.find((item) => item.id === id));
    const isMatch = Boolean(first && second && first.value === second.value);
    setTimeout(() => {
      if (isMatch) {
        const nextCards = cards.map((item) => (nextOpenIds.includes(item.id) ? { ...item, matched: true } : item));
        setCards(nextCards);
        if (nextCards.every((item) => item.matched)) onWin();
      }
      setOpenIds([]);
      setBusy(false);
    }, isMatch ? 260 : 700);
  }

  return (
    <View style={styles.card}>
      <View style={styles.gameHeaderRow}>
        <Text style={styles.sectionTitle}>Memory Match</Text>
        <Text style={styles.progressPill}>{matchedCount}/16</Text>
      </View>
      <Text style={styles.taskText}>Match all 8 pairs. Two cards stay open only if they match.</Text>
      <View style={styles.memoryGameGrid}>
        {cards.map((card) => {
          const open = openIds.includes(card.id) || card.matched;
          return (
            <Pressable key={card.id} style={[styles.memoryGameCard, open ? styles.memoryGameCardOpen : null, card.matched ? styles.memoryGameCardMatched : null]} onPress={() => handleCard(card)}>
              <Text style={styles.memoryGameCardText}>{open ? card.value : '?'}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function TapTarget({ onWin }: { onWin: () => void }) {
  const [hits, setHits] = useState(0);
  const [timeLeft, setTimeLeft] = useState(20);
  const [target, setTarget] = useState(() => buildTargetPosition(0));
  const [failed, setFailed] = useState(false);
  const targetScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (failed || hits >= 8) return undefined;
    const timer = setInterval(() => {
      setTimeLeft((current) => {
        if (current <= 1) {
          setFailed(true);
          return 0;
        }
        return current - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [failed, hits]);

  function reset() {
    setHits(0);
    setTimeLeft(20);
    setFailed(false);
    setTarget(buildTargetPosition(0));
  }

  function hitTarget() {
    if (failed) return;
    Animated.sequence([
      Animated.spring(targetScale, { toValue: 0.82, friction: 4, tension: 220, useNativeDriver: true }),
      Animated.spring(targetScale, { toValue: 1, friction: 4, tension: 220, useNativeDriver: true }),
    ]).start();
    const nextHits = hits + 1;
    setHits(nextHits);
    if (nextHits >= 8) {
      setTimeout(onWin, 250);
      return;
    }
    setTarget(buildTargetPosition(nextHits));
  }

  return (
    <View style={styles.card}>
      <View style={styles.gameHeaderRow}>
        <Text style={styles.sectionTitle}>Tap Target</Text>
        <Text style={styles.progressPill}>{hits}/8</Text>
      </View>
      <View style={styles.tapStatsRow}>
        <Text style={styles.taskText}>Time: {timeLeft}s</Text>
        <Text style={styles.taskText}>Targets: {8 - hits}</Text>
      </View>
      <View style={[styles.tapBoard, { width: tapBoardWidth, height: tapBoardHeight }]}>
        {failed ? (
          <Pressable style={styles.challengeButtonLarge} onPress={reset}>
            <Text style={styles.challengeButtonLargeText}>Retry target run</Text>
          </Pressable>
        ) : (
          <Animated.View style={[styles.tapTarget, { left: target.x, top: target.y, transform: [{ scale: targetScale }] }]}>
            <Pressable style={styles.tapTargetPressable} onPress={hitTarget}>
              <Text style={styles.tapTargetText}>{target.label}</Text>
            </Pressable>
          </Animated.View>
        )}
      </View>
    </View>
  );
}

function BackButton({ scale, onBack }: { scale: Animated.Value; onBack: () => void }) {
  return (
    <Pressable onPress={onBack} onPressIn={() => animateScale(scale, 0.96)} onPressOut={() => animateScale(scale, 1)}>
      <Animated.View style={[styles.backButton, { transform: [{ scale }] }]}>
        <Text style={styles.backButtonText}>Back to panic screen</Text>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 110 },
  title: { color: colors.text, fontSize: isSmall ? 32 : 38, lineHeight: isSmall ? 38 : 44, fontWeight: '900', letterSpacing: -1.2 },
  subtitle: { color: colors.muted, fontSize: 16, lineHeight: 24, marginTop: 10, marginBottom: 20 },
  card: { borderRadius: 22, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, padding: 16, marginBottom: 16 },
  sectionTitle: { color: colors.text, fontSize: 20, fontWeight: '900', marginBottom: 12 },
  taskText: { color: colors.text, fontSize: 18, lineHeight: 26, fontWeight: '800' },
  gamesOverlay: { flex: 1, backgroundColor: colors.bg },
  gamePickerGrid: { gap: 14, marginBottom: 10 },
  gameModeButton: {
    minHeight: 116,
    borderRadius: 24,
    backgroundColor: colors.card,
    borderWidth: 2,
    borderTopColor: 'rgba(255,255,255,0.18)',
    borderLeftColor: 'rgba(255,255,255,0.12)',
    borderRightColor: 'rgba(0,0,0,0.42)',
    borderBottomColor: 'rgba(0,0,0,0.6)',
    padding: 18,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 9,
    elevation: 4,
  },
  gameModeIcon: { color: colors.green, fontSize: 24, fontWeight: '900', letterSpacing: 1.4, marginBottom: 10 },
  gameModeTitle: { color: colors.text, fontSize: 22, fontWeight: '900', marginBottom: 6 },
  gameModeSubtitle: { color: colors.muted, fontSize: 14, lineHeight: 20, fontWeight: '800' },
  gameHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 10 },
  progressPill: {
    color: colors.bg,
    backgroundColor: colors.green,
    overflow: 'hidden',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 13,
    fontWeight: '900',
  },
  gameQuestionPanel: {
    borderRadius: 22,
    backgroundColor: '#101022',
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    marginTop: 14,
    alignItems: 'center',
  },
  roundText: { color: colors.green, fontSize: 13, fontWeight: '900', letterSpacing: 1.2, textTransform: 'uppercase' },
  challengeQuestion: { color: colors.text, fontSize: 28, fontWeight: '900', textAlign: 'center', marginVertical: 12 },
  answerGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 14 },
  answerButton: {
    width: '48%',
    minHeight: 62,
    borderRadius: 18,
    backgroundColor: '#21213A',
    borderWidth: 2,
    borderTopColor: 'rgba(255,255,255,0.17)',
    borderLeftColor: 'rgba(255,255,255,0.1)',
    borderRightColor: 'rgba(0,0,0,0.38)',
    borderBottomColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  answerButtonCorrect: { backgroundColor: '#00A977', borderTopColor: '#7DFFD9', borderLeftColor: '#39FFC7', borderRightColor: '#047253', borderBottomColor: '#024633' },
  answerButtonWrong: { backgroundColor: '#8B101E', borderTopColor: '#FF8A95', borderLeftColor: '#FF5C6B', borderRightColor: '#630914', borderBottomColor: '#41060D' },
  answerText: { color: colors.text, fontSize: 18, fontWeight: '900', textAlign: 'center' },
  scrambleText: { color: colors.text, fontSize: isSmall ? 30 : 38, fontWeight: '900', letterSpacing: 3, textAlign: 'center' },
  memoryGameGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16, justifyContent: 'center' },
  memoryGameCard: {
    width: (width - 86) / 4,
    height: (width - 86) / 4,
    maxWidth: 76,
    maxHeight: 76,
    borderRadius: 18,
    backgroundColor: '#232342',
    borderWidth: 2,
    borderTopColor: 'rgba(255,255,255,0.18)',
    borderLeftColor: 'rgba(255,255,255,0.12)',
    borderRightColor: 'rgba(0,0,0,0.42)',
    borderBottomColor: 'rgba(0,0,0,0.58)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  memoryGameCardOpen: { backgroundColor: '#2E2E55', borderColor: colors.blue },
  memoryGameCardMatched: { backgroundColor: '#0D835F', borderColor: colors.green },
  memoryGameCardText: { color: colors.text, fontSize: 26, fontWeight: '900' },
  tapStatsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, marginTop: 8 },
  tapBoard: {
    alignSelf: 'center',
    borderRadius: 26,
    backgroundColor: '#111124',
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 16,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tapTarget: {
    position: 'absolute',
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: colors.red,
    borderWidth: 4,
    borderTopColor: '#FFB1BA',
    borderLeftColor: '#FF6C7A',
    borderRightColor: '#B41627',
    borderBottomColor: '#7B0B17',
    shadowColor: colors.red,
    shadowOpacity: 0.42,
    shadowRadius: 12,
    elevation: 6,
  },
  tapTargetPressable: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tapTargetText: { color: colors.text, fontSize: 20, fontWeight: '900' },
  challengeButtonLarge: {
    minHeight: 72,
    borderRadius: 18,
    backgroundColor: colors.green,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    paddingHorizontal: 16,
  },
  challengeButtonLargeText: { color: colors.bg, fontSize: 18, fontWeight: '900' },
  gameCompleteCard: {
    borderRadius: 28,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 22,
    alignItems: 'center',
    marginBottom: 16,
  },
  gameCompleteIcon: { color: colors.green, fontSize: 54, fontWeight: '900', marginBottom: 8 },
  gameCompleteTitle: { color: colors.text, fontSize: 24, fontWeight: '900', textAlign: 'center', marginBottom: 8 },
  gameCompleteText: { color: colors.muted, fontSize: 16, lineHeight: 24, fontWeight: '700', textAlign: 'center' },
  playAgainButton: {
    minHeight: 64,
    borderRadius: 20,
    backgroundColor: colors.green,
    borderWidth: 3,
    borderTopColor: '#6BFFD8',
    borderLeftColor: '#2FFFC5',
    borderRightColor: '#079B72',
    borderBottomColor: '#03563F',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.24,
    shadowRadius: 10,
    elevation: 5,
  },
  playAgainText: { color: colors.bg, fontSize: 17, fontWeight: '900', textAlign: 'center' },
  chooseAnotherButton: {
    minHeight: 60,
    borderRadius: 20,
    backgroundColor: '#252542',
    borderWidth: 3,
    borderTopColor: '#565680',
    borderLeftColor: '#44446E',
    borderRightColor: '#17172B',
    borderBottomColor: '#090914',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    marginTop: 12,
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 9,
    elevation: 4,
  },
  chooseAnotherText: { color: colors.text, fontSize: 16, fontWeight: '900', textAlign: 'center' },
  secondaryButton: { minHeight: 56, borderRadius: 18, backgroundColor: colors.raised, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, marginTop: 12 },
  secondaryText: { color: colors.text, fontSize: 16, fontWeight: '900', textAlign: 'center' },
  backButton: {
    minHeight: 62,
    borderRadius: 20,
    backgroundColor: '#252542',
    borderWidth: 3,
    borderTopColor: '#4B4B72',
    borderLeftColor: '#3C3C63',
    borderRightColor: '#17172B',
    borderBottomColor: '#0B0B17',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    marginTop: 12,
    shadowColor: '#000',
    shadowOpacity: 0.22,
    shadowRadius: 9,
    elevation: 4,
  },
  backButtonText: { color: colors.text, fontSize: 16, fontWeight: '900', textAlign: 'center' },
});
