// One quote per day, cycling through the list based on day-of-year.
// Same quote all day, different quote tomorrow — no API, no network needed.

const QUOTES = [
  { text: "Your mind is for having ideas, not holding them.", author: "David Allen" },
  { text: "There is never enough time to do everything, but there is always enough time to do the most important thing.", author: "Brian Tracy" },
  { text: "The key is not to prioritize what's on your schedule, but to schedule your priorities.", author: "Stephen Covey" },
  { text: "Simplicity is the ultimate sophistication.", author: "Leonardo da Vinci" },
  { text: "Either you run the day, or the day runs you.", author: "Jim Rohn" },
  { text: "The impediment to action advances action. What stands in the way becomes the way.", author: "Marcus Aurelius" },
  { text: "Begin at once to live, and count each separate day as a separate life.", author: "Seneca" },
  { text: "It is not that we have a short time to live, but that we waste a good deal of it.", author: "Seneca" },
  { text: "We suffer more often in imagination than in reality.", author: "Seneca" },
  { text: "Luck is what happens when preparation meets opportunity.", author: "Seneca" },
  { text: "You have power over your mind, not outside events. Realize this, and you will find strength.", author: "Marcus Aurelius" },
  { text: "Our life is what our thoughts make it.", author: "Marcus Aurelius" },
  { text: "Waste no more time arguing about what a good man should be. Be one.", author: "Marcus Aurelius" },
  { text: "Very little is needed to make a happy life; it is all within yourself, in your way of thinking.", author: "Marcus Aurelius" },
  { text: "First say to yourself what you would be; and then do what you have to do.", author: "Epictetus" },
  { text: "We are what we repeatedly do. Excellence, then, is not an act, but a habit.", author: "Aristotle" },
  { text: "Knowing yourself is the beginning of all wisdom.", author: "Aristotle" },
  { text: "Quality is not an act, it is a habit.", author: "Aristotle" },
  { text: "An unexamined life is not worth living.", author: "Socrates" },
  { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
  { text: "It is not enough to be busy. The question is: what are we busy about?", author: "Henry David Thoreau" },
  { text: "Plans are nothing; planning is everything.", author: "Dwight D. Eisenhower" },
  { text: "The most difficult thing is the decision to act, the rest is merely tenacity.", author: "Amelia Earhart" },
  { text: "Do the hard jobs first. The easy jobs will take care of themselves.", author: "Dale Carnegie" },
  { text: "The perfect is the enemy of the good.", author: "Voltaire" },
  { text: "Done is better than perfect.", author: "Sheryl Sandberg" },
  { text: "Efficiency is doing things right. Effectiveness is doing the right things.", author: "Peter Drucker" },
  { text: "The best way to predict the future is to create it.", author: "Peter Drucker" },
  { text: "What gets measured gets managed.", author: "Peter Drucker" },
  { text: "Focus on being productive instead of busy.", author: "Tim Ferriss" },
  { text: "Simplicity boils down to two steps: identify the essential. Eliminate the rest.", author: "Leo Babauta" },
  { text: "Wherever you are, be all there.", author: "Jim Elliot" },
  { text: "One day or day one. You decide.", author: "Unknown" },
  { text: "Start where you are. Use what you have. Do what you can.", author: "Arthur Ashe" },
  { text: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" },
  { text: "A year from now you may wish you had started today.", author: "Karen Lamb" },
  { text: "The man who moves a mountain begins by carrying away small stones.", author: "Confucius" },
  { text: "It does not matter how slowly you go as long as you do not stop.", author: "Confucius" },
  { text: "Give me six hours to chop down a tree and I will spend the first four sharpening the axe.", author: "Abraham Lincoln" },
  { text: "Whatever you are, be a good one.", author: "Abraham Lincoln" },
  { text: "Do what you can, with what you have, where you are.", author: "Theodore Roosevelt" },
  { text: "In any moment of decision, the best thing you can do is the right thing.", author: "Theodore Roosevelt" },
  { text: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
  { text: "The future depends on what you do today.", author: "Mahatma Gandhi" },
  { text: "The way to get started is to quit talking and begin doing.", author: "Walt Disney" },
  { text: "It always seems impossible until it's done.", author: "Nelson Mandela" },
  { text: "Everything should be made as simple as possible, but not simpler.", author: "Albert Einstein" },
  { text: "Imagination is more important than knowledge.", author: "Albert Einstein" },
  { text: "Nothing is worth more than this day.", author: "Johann Wolfgang von Goethe" },
  { text: "Write it on your heart that every day is the best day in the year.", author: "Ralph Waldo Emerson" },
  { text: "Do not go where the path may lead; go instead where there is no path and leave a trail.", author: "Ralph Waldo Emerson" },
  { text: "Act as if what you do makes a difference. It does.", author: "William James" },
  { text: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
  { text: "A goal is a dream with a deadline.", author: "Napoleon Hill" },
  { text: "Thinking is the hardest work there is, which is why so few engage in it.", author: "Henry Ford" },
  { text: "Whether you think you can or you think you can't, you're right.", author: "Henry Ford" },
  { text: "You miss 100% of the shots you don't take.", author: "Wayne Gretzky" },
  { text: "The scariest moment is always just before you start.", author: "Stephen King" },
  { text: "You can always edit a bad page. You can't edit a blank page.", author: "Jodi Picoult" },
  { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
  { text: "Stay hungry. Stay foolish.", author: "Steve Jobs" },
  { text: "Absorb what is useful, discard what is useless, and add what is specifically your own.", author: "Bruce Lee" },
  { text: "Nothing in life is to be feared, only to be understood.", author: "Marie Curie" },
  { text: "I am not a product of my circumstances. I am a product of my decisions.", author: "Stephen Covey" },
  { text: "Clarity is the counterbalance of profound thoughts.", author: "Luc de Clapiers" },
  { text: "You don't have to see the whole staircase, just take the first step.", author: "Martin Luther King Jr." },
  { text: "Time is what we want most, but what we use worst.", author: "William Penn" },
  { text: "If you know the why, you can live any how.", author: "Friedrich Nietzsche" },
  { text: "Without music, life would be a mistake.", author: "Friedrich Nietzsche" },
  { text: "Correction does much, but encouragement does more.", author: "Johann Wolfgang von Goethe" },
  { text: "The present moment always will have been.", author: "Unknown" },
  { text: "Discipline is the bridge between goals and accomplishment.", author: "Jim Rohn" },
  { text: "Take care of the minutes and the hours will take care of themselves.", author: "Lord Chesterfield" },
  { text: "Energy, not time, is the fundamental currency of high performance.", author: "Jim Loehr" },
  { text: "Small deeds done are better than great deeds planned.", author: "Peter Marshall" },
  { text: "A life spent making mistakes is not only more honorable, but more useful than a life spent doing nothing.", author: "George Bernard Shaw" },
  { text: "The secret to doing good research is always to be a little underemployed. You waste years by not being able to waste hours.", author: "Amos Tversky" },
]

function getDayOfYear(dateStr) {
  const now = dateStr ? new Date(dateStr + 'T12:00:00') : new Date()
  const start = new Date(now.getFullYear(), 0, 0)
  const diff = now - start
  return Math.floor(diff / (1000 * 60 * 60 * 24))
}

export default function DailyQuote({ dateStr }) {
  const { text, author } = QUOTES[getDayOfYear(dateStr) % QUOTES.length]

  return (
    <div className="text-center px-6 py-2">
      <p className="text-lg font-light italic leading-relaxed" style={{ color: '#a6adc8' }}>
        &ldquo;{text}&rdquo;
      </p>
      <p className="text-sm mt-2" style={{ color: '#6c7086' }}>
        &mdash; {author}
      </p>
    </div>
  )
}
