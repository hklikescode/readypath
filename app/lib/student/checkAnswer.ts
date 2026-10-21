export function checkAnswer(answer: string, allowedText: string): { ok: boolean; badNumbers: string[] } {
  // Extract whole number sequences (digits)
  const extractNumbers = (str: string): string[] => {
    const matches = str.match(/\d+/g);
    return matches ? matches : [];
  };

  const answerNumbers = extractNumbers(answer);
  const allowedNumbers = new Set(extractNumbers(allowedText));

  const badNumbers: string[] = [];
  for (const num of answerNumbers) {
    if (!allowedNumbers.has(num)) {
      badNumbers.push(num);
    }
  }

  return {
    ok: badNumbers.length === 0,
    badNumbers,
  };
}
