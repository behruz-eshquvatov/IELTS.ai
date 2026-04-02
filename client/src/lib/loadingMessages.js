export const loadingMessages = [
  "Every focused session compounds",
  "Keep going. Your next breakthrough is built quietly",
  "Small repetitions become fluent answers",
  "Consistency is building your score behind the scenes",
  "One more step still counts as progress",
  "Careful practice today becomes confidence later",
  "Learning is still moving, even when it feels slow",
  "Momentum grows from the sessions you do not skip",
];

export function getRandomLoadingMessage(previousMessage = "") {
  const availableMessages = loadingMessages.filter((message) => message !== previousMessage);

  if (!availableMessages.length) {
    return loadingMessages[0];
  }

  return availableMessages[Math.floor(Math.random() * availableMessages.length)];
}
