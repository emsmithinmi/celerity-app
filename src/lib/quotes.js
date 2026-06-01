// ─── Quote Pool ───────────────────────────────────────────────────────────────
// 400 quotes across 6 categories, weighted for AI selection.
// Categories: stoicism (20%), science (20%), comedian (20%),
//             movie (15%), software (15%), motivational (10%)

export const QUOTE_POOL = [

  // ═══════════════════════════════════════════════════════════════════════════
  // STOICISM (80)
  // ═══════════════════════════════════════════════════════════════════════════

  // Marcus Aurelius — Meditations
  { text: "You have power over your mind, not outside events. Realize this, and you will find strength.", author: "Marcus Aurelius", category: "stoicism" },
  { text: "The impediment to action advances action. What stands in the way becomes the way.", author: "Marcus Aurelius", category: "stoicism" },
  { text: "Very little is needed to make a happy life; it is all within yourself, in your way of thinking.", author: "Marcus Aurelius", category: "stoicism" },
  { text: "Waste no more time arguing about what a good man should be. Be one.", author: "Marcus Aurelius", category: "stoicism" },
  { text: "The best revenge is to be unlike him who performed the injustice.", author: "Marcus Aurelius", category: "stoicism" },
  { text: "Dwell on the beauty of life. Watch the stars, and see yourself running with them.", author: "Marcus Aurelius", category: "stoicism" },
  { text: "If it is not right, do not do it; if it is not true, do not say it.", author: "Marcus Aurelius", category: "stoicism" },
  { text: "What we do now echoes in eternity.", author: "Marcus Aurelius", category: "stoicism" },
  { text: "It is not death that a man should fear, but he should fear never beginning to live.", author: "Marcus Aurelius", category: "stoicism" },
  { text: "Loss is nothing else but change, and change is Nature's delight.", author: "Marcus Aurelius", category: "stoicism" },
  { text: "The object of life is not to be on the side of the majority, but to escape finding oneself in the ranks of the insane.", author: "Marcus Aurelius", category: "stoicism" },
  { text: "How much more grievous are the consequences of anger than the causes of it.", author: "Marcus Aurelius", category: "stoicism" },
  { text: "Confine yourself to the present.", author: "Marcus Aurelius", category: "stoicism" },
  { text: "Perfection of character: to live each day as if it were your last, without frenzy, without apathy, without pretense.", author: "Marcus Aurelius", category: "stoicism" },
  { text: "Never esteem anything as of advantage to you that will make you break your word or lose your self-respect.", author: "Marcus Aurelius", category: "stoicism" },
  { text: "The art of living is more like wrestling than dancing.", author: "Marcus Aurelius", category: "stoicism" },
  { text: "Do not indulge in dreams of what you do not have, but count up the blessings you actually have.", author: "Marcus Aurelius", category: "stoicism" },
  { text: "Not 'This is misfortune,' but 'To bear this worthily is good fortune.'", author: "Marcus Aurelius", category: "stoicism" },
  { text: "The nearer a man comes to a calm mind, the closer he is to strength.", author: "Marcus Aurelius", category: "stoicism" },
  { text: "Accept the things to which fate binds you, and love the people with whom fate brings you together.", author: "Marcus Aurelius", category: "stoicism" },
  { text: "Our life is what our thoughts make it.", author: "Marcus Aurelius", category: "stoicism" },
  { text: "Do not act as if you had ten thousand years to live.", author: "Marcus Aurelius", category: "stoicism" },
  { text: "Be tolerant with others and strict with yourself.", author: "Marcus Aurelius", category: "stoicism" },
  { text: "You always own the option of having no opinion.", author: "Marcus Aurelius", category: "stoicism" },
  { text: "The soul becomes dyed with the color of its thoughts.", author: "Marcus Aurelius", category: "stoicism" },
  { text: "Receive without pride, abandon without struggle.", author: "Marcus Aurelius", category: "stoicism" },
  { text: "Nothing happens to any man that he is not formed by nature to bear.", author: "Marcus Aurelius", category: "stoicism" },
  { text: "If someone is able to show me that what I think or do is not right, I will happily change, for I seek the truth.", author: "Marcus Aurelius", category: "stoicism" },
  { text: "Everything we hear is an opinion, not a fact. Everything we see is a perspective, not the truth.", author: "Marcus Aurelius", category: "stoicism" },
  { text: "Think not of what is absent, but count the blessings you actually possess.", author: "Marcus Aurelius", category: "stoicism" },
  { text: "Time is a river of vanishing moments, and its current is swift.", author: "Marcus Aurelius", category: "stoicism" },

  // Seneca — Epistulae Morales, De Brevitate Vitae
  { text: "We suffer more often in imagination than in reality.", author: "Seneca", category: "stoicism" },
  { text: "Luck is what happens when preparation meets opportunity.", author: "Seneca", category: "stoicism" },
  { text: "Begin at once to live, and count each separate day as a separate life.", author: "Seneca", category: "stoicism" },
  { text: "It is not that we have a short time to live, but that we waste a good deal of it.", author: "Seneca", category: "stoicism" },
  { text: "He who is brave is free.", author: "Seneca", category: "stoicism" },
  { text: "The greatest remedy for anger is delay.", author: "Seneca", category: "stoicism" },
  { text: "While we delay, life hurries on.", author: "Seneca", category: "stoicism" },
  { text: "No man was ever wise by chance.", author: "Seneca", category: "stoicism" },
  { text: "He suffers more than necessary, who suffers before it is necessary.", author: "Seneca", category: "stoicism" },
  { text: "There is no easy path from earth to the stars.", author: "Seneca", category: "stoicism" },
  { text: "The part of life we really live is small.", author: "Seneca", category: "stoicism" },
  { text: "It is quality rather than quantity that matters.", author: "Seneca", category: "stoicism" },
  { text: "Associate with those who will make a better man of you.", author: "Seneca", category: "stoicism" },
  { text: "True happiness is to enjoy the present, without anxious dependence upon the future.", author: "Seneca", category: "stoicism" },
  { text: "Difficulties strengthen the mind, as labor does the body.", author: "Seneca", category: "stoicism" },
  { text: "Wherever there is a human being, there is an opportunity for a kindness.", author: "Seneca", category: "stoicism" },
  { text: "A man is as miserable as he thinks he is.", author: "Seneca", category: "stoicism" },
  { text: "Until we have begun to go without them, we fail to realize how unnecessary many things are.", author: "Seneca", category: "stoicism" },
  { text: "Set yourself free from the past. Let it touch you lightly.", author: "Seneca", category: "stoicism" },
  { text: "Life without a design is erratic. As soon as one is in place, principles become necessary.", author: "Seneca", category: "stoicism" },
  { text: "No one is more wretched than a man who forgets his blessings.", author: "Seneca", category: "stoicism" },

  // Epictetus — Enchiridion, Discourses
  { text: "It's not what happens to you, but how you react to it that matters.", author: "Epictetus", category: "stoicism" },
  { text: "Make the best use of what is in your power, and take the rest as it happens.", author: "Epictetus", category: "stoicism" },
  { text: "Seek not the good in external things; seek it in yourself.", author: "Epictetus", category: "stoicism" },
  { text: "He is a wise man who does not grieve for the things which he has not, but rejoices for those which he has.", author: "Epictetus", category: "stoicism" },
  { text: "If you want to improve, be content to be thought foolish and stupid.", author: "Epictetus", category: "stoicism" },
  { text: "No man is free who is not master of himself.", author: "Epictetus", category: "stoicism" },
  { text: "Men are disturbed not by the things which happen, but by the opinions about the things.", author: "Epictetus", category: "stoicism" },
  { text: "Wealth consists not in having great possessions, but in having few wants.", author: "Epictetus", category: "stoicism" },
  { text: "We cannot choose our external circumstances, but we can always choose how we respond to them.", author: "Epictetus", category: "stoicism" },
  { text: "Don't explain your philosophy. Embody it.", author: "Epictetus", category: "stoicism" },
  { text: "Freedom is not procured by a full enjoyment of what is desired, but by controlling the desire.", author: "Epictetus", category: "stoicism" },
  { text: "First learn the meaning of what you say, and then speak.", author: "Epictetus", category: "stoicism" },
  { text: "The two powers which in my opinion constitute a wise man are those of bearing and forbearing.", author: "Epictetus", category: "stoicism" },

  // Zeno, Socrates, Ryan Holiday, Viktor Frankl
  { text: "Man conquers the world by conquering himself.", author: "Zeno of Citium", category: "stoicism" },
  { text: "Better to trip with the feet than with the tongue.", author: "Zeno of Citium", category: "stoicism" },
  { text: "We have two ears and one mouth, so we should listen more than we say.", author: "Zeno of Citium", category: "stoicism" },
  { text: "The only true wisdom is in knowing you know nothing.", author: "Socrates", category: "stoicism" },
  { text: "An unexamined life is not worth living.", author: "Socrates", category: "stoicism" },
  { text: "The obstacle is the way.", author: "Ryan Holiday", category: "stoicism" },
  { text: "Ego is the enemy.", author: "Ryan Holiday", category: "stoicism" },
  { text: "Amor fati: love your fate — which is in fact your life.", author: "Stoic Maxim", category: "stoicism" },
  { text: "Memento mori. You will die. Live accordingly.", author: "Stoic Maxim", category: "stoicism" },
  { text: "What is to give light must endure burning.", author: "Viktor Frankl", category: "stoicism" },
  { text: "Between stimulus and response there is a space. In that space is our power to choose our response.", author: "Viktor Frankl", category: "stoicism" },
  { text: "The last of human freedoms is to choose one's attitude in a given set of circumstances.", author: "Viktor Frankl", category: "stoicism" },
  { text: "He who has a why to live can bear almost any how.", author: "Friedrich Nietzsche", category: "stoicism" },

  // ═══════════════════════════════════════════════════════════════════════════
  // SCIENCE (80)
  // ═══════════════════════════════════════════════════════════════════════════

  // Carl Sagan
  { text: "The cosmos is within us. We are made of star-stuff. We are a way for the universe to know itself.", author: "Carl Sagan", category: "science" },
  { text: "Somewhere, something incredible is waiting to be known.", author: "Carl Sagan", category: "science" },
  { text: "We are like butterflies who flutter for a day and think it is forever.", author: "Carl Sagan", category: "science" },
  { text: "For small creatures such as we the vastness is bearable only through love.", author: "Carl Sagan", category: "science" },
  { text: "The nitrogen in our DNA, the calcium in our teeth, the iron in our blood — made in the interiors of collapsing stars.", author: "Carl Sagan", category: "science" },
  { text: "Extraordinary claims require extraordinary evidence.", author: "Carl Sagan", category: "science" },
  { text: "Science is not only compatible with spirituality; it is a profound source of spirituality.", author: "Carl Sagan", category: "science" },
  { text: "If you wish to make an apple pie from scratch, you must first invent the universe.", author: "Carl Sagan", category: "science" },
  { text: "We live in a society exquisitely dependent on science and technology, in which hardly anyone knows anything about science and technology.", author: "Carl Sagan", category: "science" },
  { text: "One of the great commandments of science: Mistrust arguments from authority.", author: "Carl Sagan", category: "science" },
  { text: "Absence of evidence is not evidence of absence.", author: "Carl Sagan", category: "science" },
  { text: "The cosmos is all that is or was or ever will be.", author: "Carl Sagan", category: "science" },
  { text: "The universe is not required to be in perfect harmony with human ambition.", author: "Carl Sagan", category: "science" },

  // Neil deGrasse Tyson
  { text: "We are all connected: to each other, biologically; to the earth, chemically; to the rest of the universe, atomically.", author: "Neil deGrasse Tyson", category: "science" },
  { text: "The good thing about science is that it's true whether or not you believe in it.", author: "Neil deGrasse Tyson", category: "science" },
  { text: "For me, I am driven by two main philosophies: know more today than I knew yesterday, and lessen the suffering of others.", author: "Neil deGrasse Tyson", category: "science" },
  { text: "Not only are we in the universe, the universe is in us.", author: "Neil deGrasse Tyson", category: "science" },
  { text: "Curious that we spend more time congratulating people who have succeeded than encouraging people who have not.", author: "Neil deGrasse Tyson", category: "science" },
  { text: "The universe is under no obligation to make sense to you.", author: "Neil deGrasse Tyson", category: "science" },
  { text: "Kids are born curious about the world. What adults primarily do in the presence of kids is unwittingly thwart that curiosity.", author: "Neil deGrasse Tyson", category: "science" },
  { text: "I dream of a world where truth shapes people's politics, rather than politics shaping what people think is true.", author: "Neil deGrasse Tyson", category: "science" },
  { text: "The atoms of our bodies are traceable to stars that exploded their enriched ingredients across our galaxy, billions of years ago.", author: "Neil deGrasse Tyson", category: "science" },

  // Richard Feynman
  { text: "I would rather have questions that can't be answered than answers that can't be questioned.", author: "Richard Feynman", category: "science" },
  { text: "Physics is like sex: sure, it may give some practical results, but that's not why we do it.", author: "Richard Feynman", category: "science" },
  { text: "The first principle is that you must not fool yourself, and you are the easiest person to fool.", author: "Richard Feynman", category: "science" },
  { text: "Study hard what interests you the most in the most undisciplined, irreverent and original manner possible.", author: "Richard Feynman", category: "science" },
  { text: "The imagination of nature is far, far greater than the imagination of man.", author: "Richard Feynman", category: "science" },
  { text: "If you think you understand quantum mechanics, you don't understand quantum mechanics.", author: "Richard Feynman", category: "science" },
  { text: "I learned very early the difference between knowing the name of something and knowing something.", author: "Richard Feynman", category: "science" },
  { text: "What I cannot create, I do not understand.", author: "Richard Feynman", category: "science" },
  { text: "Nature uses only the longest threads to weave her patterns, so each small piece of her fabric reveals the organization of the entire tapestry.", author: "Richard Feynman", category: "science" },
  { text: "The pleasure of finding things out is one of the greatest experiences a person can have.", author: "Richard Feynman", category: "science" },
  { text: "Science is a way of trying not to fool yourself.", author: "Richard Feynman", category: "science" },

  // Stephen Hawking
  { text: "Intelligence is the ability to adapt to change.", author: "Stephen Hawking", category: "science" },
  { text: "However difficult life may seem, there is always something you can do and succeed at.", author: "Stephen Hawking", category: "science" },
  { text: "Life would be tragic if it weren't funny.", author: "Stephen Hawking", category: "science" },
  { text: "We are just an advanced breed of monkeys on a minor planet of a very average star. But we can understand the Universe. That makes us something very special.", author: "Stephen Hawking", category: "science" },
  { text: "Remember to look up at the stars and not down at your feet. Never give up work. Work gives you meaning and purpose and life is empty without it.", author: "Stephen Hawking", category: "science" },
  { text: "The greatest enemy of knowledge is not ignorance; it is the illusion of knowledge.", author: "Stephen Hawking", category: "science" },
  { text: "If time travel is possible, where are the tourists from the future?", author: "Stephen Hawking", category: "science" },

  // Albert Einstein
  { text: "The most beautiful thing we can experience is the mysterious. It is the source of all true art and science.", author: "Albert Einstein", category: "science" },
  { text: "A person who never made a mistake never tried anything new.", author: "Albert Einstein", category: "science" },
  { text: "The measure of intelligence is the ability to change.", author: "Albert Einstein", category: "science" },
  { text: "Logic will get you from A to B. Imagination will take you everywhere.", author: "Albert Einstein", category: "science" },
  { text: "Two things are infinite: the universe and human stupidity; and I'm not sure about the universe.", author: "Albert Einstein", category: "science" },
  { text: "God does not play dice with the universe.", author: "Albert Einstein", category: "science" },
  { text: "When you are courting a nice girl, an hour seems like a second. When you sit on a red-hot cinder, a second seems like an hour. That's relativity.", author: "Albert Einstein", category: "science" },
  { text: "The most incomprehensible thing about the universe is that it is comprehensible.", author: "Albert Einstein", category: "science" },
  { text: "Reality is merely an illusion, albeit a very persistent one.", author: "Albert Einstein", category: "science" },

  // Marie Curie
  { text: "Nothing in life is to be feared, only to be understood. Now is the time to understand more, so that we may fear less.", author: "Marie Curie", category: "science" },
  { text: "Be less curious about people and more curious about ideas.", author: "Marie Curie", category: "science" },
  { text: "I am among those who think that science has great beauty.", author: "Marie Curie", category: "science" },

  // Niels Bohr
  { text: "If quantum mechanics hasn't profoundly shocked you, you haven't understood it yet.", author: "Niels Bohr", category: "science" },
  { text: "An expert is a person who has made all the mistakes that can be made in a very narrow field.", author: "Niels Bohr", category: "science" },
  { text: "The opposite of a correct statement is a false statement. But the opposite of a profound truth may well be another profound truth.", author: "Niels Bohr", category: "science" },
  { text: "Prediction is very difficult, especially about the future.", author: "Niels Bohr", category: "science" },
  { text: "Stop telling God what to do with his dice.", author: "Niels Bohr", category: "science" },

  // Others
  { text: "Science is the poetry of reality.", author: "Richard Dawkins", category: "science" },
  { text: "The universe we observe has precisely the properties we should expect if there is, at bottom, no design, no purpose, nothing but blind, pitiless indifference.", author: "Richard Dawkins", category: "science" },
  { text: "If you want to find the secrets of the universe, think in terms of energy, frequency and vibration.", author: "Nikola Tesla", category: "science" },
  { text: "The present is theirs; the future, for which I have really worked, is mine.", author: "Nikola Tesla", category: "science" },
  { text: "I don't care that they stole my idea. I care that they don't have any of their own.", author: "Nikola Tesla", category: "science" },
  { text: "Any sufficiently advanced technology is indistinguishable from magic.", author: "Arthur C. Clarke", category: "science" },
  { text: "The only way of discovering the limits of the possible is to venture a little way past them into the impossible.", author: "Arthur C. Clarke", category: "science" },
  { text: "Two possibilities exist: either we are alone in the universe or we are not. Both are equally terrifying.", author: "Arthur C. Clarke", category: "science" },
  { text: "There is a theory which states that if ever anyone discovers exactly what the Universe is for and why it is here, it will instantly disappear and be replaced by something even more bizarre and inexplicable. There is another theory which states that this has already happened.", author: "Douglas Adams", category: "science" },
  { text: "Space is big. You just won't believe how vastly, hugely, mind-bogglingly big it is.", author: "Douglas Adams", category: "science" },
  { text: "Science cannot solve the ultimate mystery of nature — because we ourselves are part of the mystery.", author: "Max Planck", category: "science" },
  { text: "A new scientific truth does not triumph by convincing its opponents, but because its opponents eventually die.", author: "Max Planck", category: "science" },
  { text: "Artificial intelligence is the new electricity.", author: "Andrew Ng", category: "science" },
  { text: "The universe is not only queerer than we suppose, but queerer than we can suppose.", author: "J.B.S. Haldane", category: "science" },
  { text: "Research is what I'm doing when I don't know what I'm doing.", author: "Wernher von Braun", category: "science" },
  { text: "In science, there are no shortcuts to truth.", author: "Karl Popper", category: "science" },
  { text: "The human brain has 100 billion neurons, each neuron connected to 10,000 other neurons. Sitting on your shoulders is the most complicated object in the known universe.", author: "Michio Kaku", category: "science" },
  { text: "Physics is the universe's operating system.", author: "Michio Kaku", category: "science" },
  { text: "Every atom in your body came from a star that exploded. You are all stardust.", author: "Lawrence Krauss", category: "science" },
  { text: "There are no passengers on Spaceship Earth. We are all crew.", author: "Marshall McLuhan", category: "science" },
  { text: "In physics, you don't have to go around making trouble for yourself — nature does it for you.", author: "Frank Wilczek", category: "science" },
  { text: "Equipped with his five senses, man explores the universe around him and calls the adventure Science.", author: "Edwin Hubble", category: "science" },

  // ═══════════════════════════════════════════════════════════════════════════
  // MOVIE QUOTES (60)
  // ═══════════════════════════════════════════════════════════════════════════

  { text: "Get busy living, or get busy dying.", author: "The Shawshank Redemption (1994)", category: "movie" },
  { text: "Hope is a good thing, maybe the best of things, and no good thing ever dies.", author: "The Shawshank Redemption (1994)", category: "movie" },
  { text: "Some birds aren't meant to be caged. Their feathers are just too bright.", author: "The Shawshank Redemption (1994)", category: "movie" },
  { text: "Leave the gun. Take the cannoli.", author: "The Godfather (1972)", category: "movie" },
  { text: "I'm gonna make him an offer he can't refuse.", author: "The Godfather (1972)", category: "movie" },
  { text: "Keep your friends close, but your enemies closer.", author: "The Godfather Part II (1974)", category: "movie" },
  { text: "Here's looking at you, kid.", author: "Casablanca (1942)", category: "movie" },
  { text: "Of all the gin joints in all the towns in all the world, she walks into mine.", author: "Casablanca (1942)", category: "movie" },
  { text: "We'll always have Paris.", author: "Casablanca (1942)", category: "movie" },
  { text: "All those moments will be lost in time, like tears in rain.", author: "Blade Runner (1982)", category: "movie" },
  { text: "Do. Or do not. There is no try.", author: "The Empire Strikes Back (1980)", category: "movie" },
  { text: "It's not the years, honey. It's the mileage.", author: "Raiders of the Lost Ark (1981)", category: "movie" },
  { text: "The Dude abides.", author: "The Big Lebowski (1998)", category: "movie" },
  { text: "Life moves pretty fast. If you don't stop and look around once in a while, you could miss it.", author: "Ferris Bueller's Day Off (1986)", category: "movie" },
  { text: "Carpe diem. Seize the day, boys. Make your lives extraordinary.", author: "Dead Poets Society (1989)", category: "movie" },
  { text: "The things you own end up owning you.", author: "Fight Club (1999)", category: "movie" },
  { text: "It's only after we've lost everything that we're free to do anything.", author: "Fight Club (1999)", category: "movie" },
  { text: "Houston, we have a problem.", author: "Apollo 13 (1995)", category: "movie" },
  { text: "What we do in life echoes in eternity.", author: "Gladiator (2000)", category: "movie" },
  { text: "Are you not entertained?", author: "Gladiator (2000)", category: "movie" },
  { text: "There is no spoon.", author: "The Matrix (1999)", category: "movie" },
  { text: "It's just a flesh wound.", author: "Monty Python and the Holy Grail (1975)", category: "movie" },
  { text: "I love the smell of napalm in the morning.", author: "Apocalypse Now (1979)", category: "movie" },
  { text: "The horror... the horror.", author: "Apocalypse Now (1979)", category: "movie" },
  { text: "Well, nobody's perfect.", author: "Some Like It Hot (1959)", category: "movie" },
  { text: "Fasten your seatbelts. It's going to be a bumpy night.", author: "All About Eve (1950)", category: "movie" },
  { text: "I'm mad as hell, and I'm not going to take this anymore!", author: "Network (1976)", category: "movie" },
  { text: "What we've got here is a failure to communicate.", author: "Cool Hand Luke (1967)", category: "movie" },
  { text: "You talkin' to me?", author: "Taxi Driver (1976)", category: "movie" },
  { text: "As you wish.", author: "The Princess Bride (1987)", category: "movie" },
  { text: "Hello. My name is Inigo Montoya. You killed my father. Prepare to die.", author: "The Princess Bride (1987)", category: "movie" },
  { text: "Inconceivable!", author: "The Princess Bride (1987)", category: "movie" },
  { text: "Where we're going, we don't need roads.", author: "Back to the Future (1985)", category: "movie" },
  { text: "You know what they call a Quarter Pounder with cheese in Paris? A Royale with cheese.", author: "Pulp Fiction (1994)", category: "movie" },
  { text: "You can't handle the truth!", author: "A Few Good Men (1992)", category: "movie" },
  { text: "Life is like a box of chocolates. You never know what you're gonna get.", author: "Forrest Gump (1994)", category: "movie" },
  { text: "Life finds a way.", author: "Jurassic Park (1993)", category: "movie" },
  { text: "Your scientists were so preoccupied with whether or not they could, they didn't stop to think if they should.", author: "Jurassic Park (1993)", category: "movie" },
  { text: "If you build it, they will come.", author: "Field of Dreams (1989)", category: "movie" },
  { text: "In case I don't see ya — good afternoon, good evening, and good night!", author: "The Truman Show (1998)", category: "movie" },
  { text: "I did absolutely nothing, and it was everything that I thought it could be.", author: "Office Space (1999)", category: "movie" },
  { text: "Gentlemen, you can't fight in here! This is the War Room!", author: "Dr. Strangelove (1964)", category: "movie" },
  { text: "You make me want to be a better man.", author: "As Good as It Gets (1997)", category: "movie" },
  { text: "May the Force be with you.", author: "Star Wars: A New Hope (1977)", category: "movie" },
  { text: "I'll be back.", author: "The Terminator (1984)", category: "movie" },
  { text: "Go ahead, make my day.", author: "Sudden Impact (1983)", category: "movie" },
  { text: "You had me at hello.", author: "Jerry Maguire (1996)", category: "movie" },
  { text: "Show me the money!", author: "Jerry Maguire (1996)", category: "movie" },
  { text: "I see dead people.", author: "The Sixth Sense (1999)", category: "movie" },
  { text: "Frankly, my dear, I don't give a damn.", author: "Gone with the Wind (1939)", category: "movie" },
  { text: "Here's Johnny!", author: "The Shining (1980)", category: "movie" },
  { text: "Nobody puts Baby in a corner.", author: "Dirty Dancing (1987)", category: "movie" },
  { text: "Hasta la vista, baby.", author: "Terminator 2: Judgment Day (1991)", category: "movie" },
  { text: "A million dollars isn't cool. You know what's cool? A billion dollars.", author: "The Social Network (2010)", category: "movie" },
  { text: "They may take our lives, but they'll never take our freedom!", author: "Braveheart (1995)", category: "movie" },
  { text: "After all, tomorrow is another day.", author: "Gone with the Wind (1939)", category: "movie" },
  { text: "Toto, I've a feeling we're not in Kansas anymore.", author: "The Wizard of Oz (1939)", category: "movie" },
  { text: "I am serious. And don't call me Shirley.", author: "Airplane! (1980)", category: "movie" },
  { text: "It's alive! It's alive!", author: "Frankenstein (1931)", category: "movie" },
  { text: "Elementary, my dear Watson.", author: "The Adventures of Sherlock Holmes (1939)", category: "movie" },

  // ═══════════════════════════════════════════════════════════════════════════
  // MOTIVATIONAL (40)
  // ═══════════════════════════════════════════════════════════════════════════

  { text: "The only limit to our realization of tomorrow will be our doubts of today.", author: "Franklin D. Roosevelt", category: "motivational" },
  { text: "You must be the change you wish to see in the world.", author: "Mahatma Gandhi", category: "motivational" },
  { text: "In the middle of every difficulty lies opportunity.", author: "Albert Einstein", category: "motivational" },
  { text: "The only way out is through.", author: "Robert Frost", category: "motivational" },
  { text: "Fall seven times and stand up eight.", author: "Japanese Proverb", category: "motivational" },
  { text: "The harder the conflict, the greater the triumph.", author: "George Washington", category: "motivational" },
  { text: "You are never too old to set another goal or to dream a new dream.", author: "C.S. Lewis", category: "motivational" },
  { text: "Courage is resistance to fear, mastery of fear — not absence of fear.", author: "Mark Twain", category: "motivational" },
  { text: "The most common way people give up their power is by thinking they don't have any.", author: "Alice Walker", category: "motivational" },
  { text: "It's not whether you get knocked down; it's whether you get up.", author: "Vince Lombardi", category: "motivational" },
  { text: "You don't have to be great to start, but you have to start to be great.", author: "Zig Ziglar", category: "motivational" },
  { text: "People will forget what you said, people will forget what you did, but people will never forget how you made them feel.", author: "Maya Angelou", category: "motivational" },
  { text: "Go confidently in the direction of your dreams. Live the life you have imagined.", author: "Henry David Thoreau", category: "motivational" },
  { text: "When the whole world is silent, even one voice becomes powerful.", author: "Malala Yousafzai", category: "motivational" },
  { text: "Education is the most powerful weapon which you can use to change the world.", author: "Nelson Mandela", category: "motivational" },
  { text: "To live is the rarest thing in the world. Most people exist, that is all.", author: "Oscar Wilde", category: "motivational" },
  { text: "Be yourself; everyone else is already taken.", author: "Oscar Wilde", category: "motivational" },
  { text: "A smooth sea never made a skilled sailor.", author: "English Proverb", category: "motivational" },
  { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt", category: "motivational" },
  { text: "With the new day comes new strength and new thoughts.", author: "Eleanor Roosevelt", category: "motivational" },
  { text: "You are braver than you believe, stronger than you seem, and smarter than you think.", author: "A.A. Milne", category: "motivational" },
  { text: "What lies behind us and what lies before us are tiny matters compared to what lies within us.", author: "Ralph Waldo Emerson", category: "motivational" },
  { text: "The only person you are destined to become is the person you decide to be.", author: "Ralph Waldo Emerson", category: "motivational" },
  { text: "Not everything that is faced can be changed, but nothing can be changed until it is faced.", author: "James Baldwin", category: "motivational" },
  { text: "Try to be a rainbow in someone's cloud.", author: "Maya Angelou", category: "motivational" },
  { text: "Life is 10% what happens to you and 90% how you react to it.", author: "Charles R. Swindoll", category: "motivational" },
  { text: "Tough times never last, but tough people do.", author: "Robert H. Schuller", category: "motivational" },
  { text: "Champions keep playing until they get it right.", author: "Billie Jean King", category: "motivational" },
  { text: "In the end, it's not the years in your life that count. It's the life in your years.", author: "Abraham Lincoln", category: "motivational" },
  { text: "Nothing is impossible. The word itself says 'I'm possible!'", author: "Audrey Hepburn", category: "motivational" },
  { text: "Success usually comes to those who are too busy to be looking for it.", author: "Henry David Thoreau", category: "motivational" },
  { text: "Dream big and dare to fail.", author: "Norman Vaughan", category: "motivational" },
  { text: "We know what we are, but know not what we may be.", author: "William Shakespeare", category: "motivational" },
  { text: "I am not a product of my circumstances. I am a product of my decisions.", author: "Stephen Covey", category: "motivational" },
  { text: "The future depends on what you do today.", author: "Mahatma Gandhi", category: "motivational" },
  { text: "Spread love everywhere you go. Let no one ever come to you without leaving happier.", author: "Mother Teresa", category: "motivational" },
  { text: "Keep your face always toward the sunshine, and shadows will fall behind you.", author: "Walt Whitman", category: "motivational" },
  { text: "Shoot for the moon. Even if you miss, you'll land among the stars.", author: "Norman Vincent Peale", category: "motivational" },
  { text: "Everything you've ever wanted is on the other side of fear.", author: "George Addair", category: "motivational" },
  { text: "Start where you are. Use what you have. Do what you can.", author: "Arthur Ashe", category: "motivational" },

  // ═══════════════════════════════════════════════════════════════════════════
  // COMEDIANS (80)
  // ═══════════════════════════════════════════════════════════════════════════

  // George Carlin
  { text: "Inside every cynical person, there is a disappointed idealist.", author: "George Carlin", category: "comedian" },
  { text: "The reason I talk to myself is because I'm the only one whose answers I accept.", author: "George Carlin", category: "comedian" },
  { text: "Don't just teach your children to read. Teach them to question what they read. Teach them to question everything.", author: "George Carlin", category: "comedian" },
  { text: "Never underestimate the power of stupid people in large groups.", author: "George Carlin", category: "comedian" },
  { text: "If it's true that our species is alone in the universe, then I'd have to say the universe aimed rather low and settled for very little.", author: "George Carlin", category: "comedian" },
  { text: "Fighting for peace is like screwing for virginity.", author: "George Carlin", category: "comedian" },
  { text: "One tequila, two tequila, three tequila, floor.", author: "George Carlin", category: "comedian" },
  { text: "The status quo sucks.", author: "George Carlin", category: "comedian" },

  // Mitch Hedberg
  { text: "I'm sick of following my dreams, man. I'm just going to ask where they're going and hook up with 'em later.", author: "Mitch Hedberg", category: "comedian" },
  { text: "An escalator can never break: it can only become stairs. You would never see a sign that says 'Escalator temporarily out of order.' It would say 'Escalator temporarily stairs. Sorry for the convenience.'", author: "Mitch Hedberg", category: "comedian" },
  { text: "I don't have a girlfriend. But I do know a woman who'd be mad at me for saying that.", author: "Mitch Hedberg", category: "comedian" },
  { text: "I used to do drugs. I still do, but I used to, too.", author: "Mitch Hedberg", category: "comedian" },
  { text: "My fake plants died because I did not pretend to water them.", author: "Mitch Hedberg", category: "comedian" },
  { text: "I'm against picketing, but I don't know how to show it.", author: "Mitch Hedberg", category: "comedian" },
  { text: "I order the club sandwich all the time, but I'm not even a member, man.", author: "Mitch Hedberg", category: "comedian" },

  // Steven Wright
  { text: "I intend to live forever. So far, so good.", author: "Steven Wright", category: "comedian" },
  { text: "If at first you don't succeed, destroy all evidence that you tried.", author: "Steven Wright", category: "comedian" },
  { text: "Depression is merely anger without enthusiasm.", author: "Steven Wright", category: "comedian" },
  { text: "The problem with the gene pool is that there's no lifeguard.", author: "Steven Wright", category: "comedian" },
  { text: "A conclusion is the place where you got tired of thinking.", author: "Steven Wright", category: "comedian" },
  { text: "I almost had a psychic girlfriend but she left me before we met.", author: "Steven Wright", category: "comedian" },
  { text: "Everywhere is within walking distance if you have the time.", author: "Steven Wright", category: "comedian" },
  { text: "Black holes are where God divided by zero.", author: "Steven Wright", category: "comedian" },
  { text: "The early bird gets the worm, but the second mouse gets the cheese.", author: "Steven Wright", category: "comedian" },
  { text: "I'd kill for a Nobel Peace Prize.", author: "Steven Wright", category: "comedian" },

  // Robin Williams
  { text: "No matter what people tell you, words and ideas can change the world.", author: "Robin Williams", category: "comedian" },
  { text: "You're only given a little spark of madness. You mustn't lose it.", author: "Robin Williams", category: "comedian" },
  { text: "Comedy is acting out optimism.", author: "Robin Williams", category: "comedian" },

  // Bill Hicks
  { text: "It's just a ride.", author: "Bill Hicks", category: "comedian" },
  { text: "Life is only a dream, and we are the imagination of ourselves.", author: "Bill Hicks", category: "comedian" },
  { text: "The world is like a ride in an amusement park, and when you choose to go on it, you think it's real because that's how powerful our minds are.", author: "Bill Hicks", category: "comedian" },

  // Jon Stewart
  { text: "The internet is just a world passing notes in a classroom.", author: "Jon Stewart", category: "comedian" },
  { text: "If you don't stick to your values when they're being tested, they're not values — they're hobbies.", author: "Jon Stewart", category: "comedian" },
  { text: "Here's the thing about shame: you cannot achieve anything with it.", author: "Jon Stewart", category: "comedian" },
  { text: "Dissent is what rescues democracy from a quiet death behind closed doors.", author: "Jon Stewart", category: "comedian" },

  // Jerry Seinfeld
  { text: "Sometimes the road less traveled is less traveled for a reason.", author: "Jerry Seinfeld", category: "comedian" },
  { text: "A two-year-old is kind of like having a blender, but you don't have a top for it.", author: "Jerry Seinfeld", category: "comedian" },
  { text: "Men want the same thing from their underwear that they want from women: a little bit of support, and a little bit of freedom.", author: "Jerry Seinfeld", category: "comedian" },

  // Dave Chappelle
  { text: "The worst thing to call somebody is crazy. It's dismissive.", author: "Dave Chappelle", category: "comedian" },
  { text: "Comedy is a very subversive art form.", author: "Dave Chappelle", category: "comedian" },
  { text: "Name one hero who was happy. You can't.", author: "Dave Chappelle", category: "comedian" },

  // Norm Macdonald
  { text: "I want to die peacefully in my sleep, like my grandfather. Not screaming and yelling like the passengers in his car.", author: "Norm Macdonald", category: "comedian" },
  { text: "The key to comedy is time. And... the element of surprise.", author: "Norm Macdonald", category: "comedian" },

  // Jim Gaffigan
  { text: "You know what I like about pizza? I like pizza.", author: "Jim Gaffigan", category: "comedian" },
  { text: "Airports are a great equalizer. Everyone, no matter how important they think they are, has to wait in the same line and take off their shoes.", author: "Jim Gaffigan", category: "comedian" },

  // Conan O'Brien
  { text: "Nobody in life gets exactly what they thought they were going to get. But if you work really hard and you're kind, amazing things will happen.", author: "Conan O'Brien", category: "comedian" },
  { text: "Work hard, be kind, and amazing things will happen. I guarantee it.", author: "Conan O'Brien", category: "comedian" },

  // Louis C.K.
  { text: "'I'm bored' is a useless thing to say. You live in a great, big, vast world that you've seen none percent of.", author: "Louis C.K.", category: "comedian" },
  { text: "The only time you look in your neighbor's bowl is to make sure that they have enough.", author: "Louis C.K.", category: "comedian" },

  // Bo Burnham
  { text: "I think art that is made to make people feel less alone is the most important thing art can do.", author: "Bo Burnham", category: "comedian" },
  { text: "Comedy is the last refuge of the nonconformist mind.", author: "Bo Burnham", category: "comedian" },

  // Demetri Martin
  { text: "I like parties, but I don't like piñatas because the piñata promotes the idea that good things are trapped inside and you can get them out if you just hit them hard enough.", author: "Demetri Martin", category: "comedian" },
  { text: "A lot of people like lollipops. I don't like lollipops. To me, it's just a sucker with a stick in it.", author: "Demetri Martin", category: "comedian" },

  // Patton Oswalt
  { text: "At some point, you have to just decide: this is the version of me I'm going to be.", author: "Patton Oswalt", category: "comedian" },
  { text: "Kindness is a muscle. Work it out.", author: "Patton Oswalt", category: "comedian" },

  // Ellen DeGeneres
  { text: "Do things that make you happy within the confines of the legal system.", author: "Ellen DeGeneres", category: "comedian" },
  { text: "Find out who you are and be that person. That's what your soul was put on this Earth to be.", author: "Ellen DeGeneres", category: "comedian" },

  // Chris Rock
  { text: "Every joke has a little bit of truth in it.", author: "Chris Rock", category: "comedian" },

  // Tom Papa
  { text: "Everybody's trying their best out there. Give people a break.", author: "Tom Papa", category: "comedian" },

  // Sheng Wang
  { text: "Life is better when you appreciate what's already in it.", author: "Sheng Wang", category: "comedian" },

  // Tom Segura
  { text: "It's all in how you look at it. Most things are funnier if you step back far enough.", author: "Tom Segura", category: "comedian" },

  // Groucho Marx
  { text: "I find television very educational. Every time somebody turns it on, I go into the other room and read a book.", author: "Groucho Marx", category: "comedian" },
  { text: "Outside of a dog, a book is man's best friend. Inside of a dog, it's too dark to read.", author: "Groucho Marx", category: "comedian" },
  { text: "I refuse to join any club that would have me as a member.", author: "Groucho Marx", category: "comedian" },

  // Charlie Chaplin
  { text: "A day without laughter is a day wasted.", author: "Charlie Chaplin", category: "comedian" },
  { text: "Life is a tragedy when seen in close-up, but a comedy in long-shot.", author: "Charlie Chaplin", category: "comedian" },

  // Mark Twain (humorist)
  { text: "The secret source of humor itself is not joy but sorrow. There is no humor in heaven.", author: "Mark Twain", category: "comedian" },
  { text: "If you tell the truth, you don't have to remember anything.", author: "Mark Twain", category: "comedian" },
  { text: "Humor is mankind's greatest blessing.", author: "Mark Twain", category: "comedian" },

  // Victor Borge
  { text: "Laughter is the closest distance between two people.", author: "Victor Borge", category: "comedian" },

  // Rodney Dangerfield
  { text: "I told my psychiatrist that everyone hates me. He said I was being ridiculous — everyone hasn't met me yet.", author: "Rodney Dangerfield", category: "comedian" },

  // Phyllis Diller
  { text: "Never go to bed mad. Stay up and fight.", author: "Phyllis Diller", category: "comedian" },

  // Mike Tyson
  { text: "Everyone has a plan until they get punched in the mouth.", author: "Mike Tyson", category: "comedian" },

  // Zach Galifianakis
  { text: "I have a lot of growing up to do. I realized that the other day inside my fort.", author: "Zach Galifianakis", category: "comedian" },

  // Bob Hope
  { text: "A bank is a place that will lend you money if you can prove that you don't need it.", author: "Bob Hope", category: "comedian" },

  // Jack Handey
  { text: "Before you criticize someone, you should walk a mile in their shoes. That way when you criticize them, you're a mile away and you have their shoes.", author: "Jack Handey", category: "comedian" },

  // Bill Murray
  { text: "The best way to teach your kids about taxes is by eating 30 percent of their ice cream.", author: "Bill Murray", category: "comedian" },

  // ═══════════════════════════════════════════════════════════════════════════
  // SOFTWARE DEV HUMOR (60)
  // ═══════════════════════════════════════════════════════════════════════════

  { text: "It works on my machine.", author: "Developer Proverb", category: "software" },
  { text: "There are only two hard things in Computer Science: cache invalidation and naming things.", author: "Phil Karlton", category: "software" },
  { text: "Always code as if the person who ends up maintaining your code will be a violent psychopath who knows where you live.", author: "Martin Golding", category: "software" },
  { text: "The best code is no code at all.", author: "Jeff Atwood", category: "software" },
  { text: "Debugging is twice as hard as writing the code in the first place. Therefore, if you write the code as cleverly as possible, you are, by definition, not smart enough to debug it.", author: "Brian W. Kernighan", category: "software" },
  { text: "Talk is cheap. Show me the code.", author: "Linus Torvalds", category: "software" },
  { text: "Any fool can write code that a computer can understand. Good programmers write code that humans can understand.", author: "Martin Fowler", category: "software" },
  { text: "First, solve the problem. Then, write the code.", author: "John Johnson", category: "software" },
  { text: "In order to understand recursion, you must first understand recursion.", author: "Programming Wisdom", category: "software" },
  { text: "There are 10 types of people in the world: those who understand binary and those who don't.", author: "Developer Folklore", category: "software" },
  { text: "99 little bugs in the code. Take one down, patch it around. 127 little bugs in the code.", author: "Developer Folklore", category: "software" },
  { text: "It's not a bug — it's an undocumented feature.", author: "Developer Proverb", category: "software" },
  { text: "Code never lies. Comments sometimes do.", author: "Ron Jeffries", category: "software" },
  { text: "To iterate is human, to recurse divine.", author: "L. Peter Deutsch", category: "software" },
  { text: "Give a man a program, frustrate him for a day. Teach a man to program, frustrate him for a lifetime.", author: "Waseem Latif", category: "software" },
  { text: "The best thing about a boolean is even if you are wrong, you are only off by a bit.", author: "Programming Wisdom", category: "software" },
  { text: "When I wrote this code, only God and I understood what I did. Now only God knows.", author: "Developer Folklore", category: "software" },
  { text: "Programming is like writing a book... except if you miss a single comma on page 126 the whole thing makes no sense.", author: "Developer Folklore", category: "software" },
  { text: "A SQL query walks into a bar, walks up to two tables and asks: 'Can I join you?'", author: "Developer Folklore", category: "software" },
  { text: "There is no place like 127.0.0.1.", author: "Developer Proverb", category: "software" },
  { text: "I don't always test my code, but when I do, I do it in production.", author: "Developer Folklore", category: "software" },
  { text: "Real programmers count from 0.", author: "Developer Proverb", category: "software" },
  { text: "If debugging is the process of removing software bugs, then programming must be the process of putting them in.", author: "Edsger W. Dijkstra", category: "software" },
  { text: "The function of good software is to make the complex appear to be simple.", author: "Grady Booch", category: "software" },
  { text: "Programming isn't about what you know; it's about what you can figure out.", author: "Chris Pine", category: "software" },
  { text: "Programs must be written for people to read, and only incidentally for machines to execute.", author: "Harold Abelson", category: "software" },
  { text: "Weeks of coding can save you hours of planning.", author: "Developer Proverb", category: "software" },
  { text: "The most dangerous phrase in the language is 'We've always done it this way.'", author: "Grace Hopper", category: "software" },
  { text: "Have you tried turning it off and on again?", author: "The IT Crowd", category: "software" },
  { text: "Life is short. Use Python.", author: "Developer Wisdom", category: "software" },
  { text: "// TODO: fix this later", author: "Developer Folklore", category: "software" },
  { text: "It works, don't touch it.", author: "Developer Proverb", category: "software" },
  { text: "That's not a bug, it's a feature.", author: "Developer Proverb", category: "software" },
  { text: "My code doesn't have bugs. It has random features.", author: "Developer Folklore", category: "software" },
  { text: "git commit -m 'fix'", author: "Developer Folklore", category: "software" },
  { text: "Stack Overflow is the real documentation.", author: "Developer Proverb", category: "software" },
  { text: "404: motivation not found.", author: "Developer Folklore", category: "software" },
  { text: "If at first you don't succeed, call it version 1.0.", author: "Developer Wisdom", category: "software" },
  { text: "In C++ it's harder to shoot yourself in the foot, but when you do, you blow off your whole leg.", author: "Bjarne Stroustrup", category: "software" },
  { text: "Java is to JavaScript what car is to carpet.", author: "Chris Heilmann", category: "software" },
  { text: "The cloud is just someone else's computer.", author: "Developer Proverb", category: "software" },
  { text: "CSS: the art of fighting with the browser until one of you gives up.", author: "Developer Folklore", category: "software" },
  { text: "JavaScript is the duct tape of the internet.", author: "Charlie Campbell", category: "software" },
  { text: "// Magic. Do not touch.", author: "Developer Folklore", category: "software" },
  { text: "Documentation is like sex: when it's good, it's very good; when it's bad, it's better than nothing.", author: "Dick Brandon", category: "software" },
  { text: "Controlling complexity is the essence of computer programming.", author: "Brian Kernighan", category: "software" },
  { text: "One man's crappy software is another man's full-time job.", author: "Jessica Gaston", category: "software" },
  { text: "Why do Java programmers have to wear glasses? Because they don't C#.", author: "Developer Folklore", category: "software" },
  { text: "An infinite number of monkeys typing for an infinite amount of time will eventually produce a working JavaScript application.", author: "Developer Folklore", category: "software" },
  { text: "Senior engineer: I don't know, let me Google it.", author: "Developer Truth", category: "software" },
  { text: "The best error message is the one that never shows up.", author: "Thomas Fuchs", category: "software" },
  { text: "Make it work, make it right, make it fast — in that order.", author: "Kent Beck", category: "software" },
  { text: "What one programmer can do in one month, two programmers can do in two months.", author: "Fred Brooks", category: "software" },
  { text: "Programming today is a race between software engineers striving to build bigger and better idiot-proof programs, and the Universe trying to produce bigger and better idiots. So far, the Universe is winning.", author: "Rick Cook", category: "software" },
  { text: "A language that doesn't affect the way you think about programming is not worth knowing.", author: "Alan J. Perlis", category: "software" },
  { text: "Simple things should be simple. Complex things should be possible.", author: "Alan Kay", category: "software" },
  { text: "There are two ways to write error-free programs; only the third one works.", author: "Alan J. Perlis", category: "software" },
  { text: "I have always wished that my computer would be as easy to use as my telephone. My wish has come true because I can no longer figure out how to use my telephone.", author: "Bjarne Stroustrup", category: "software" },
  { text: "rm -rf node_modules && npm install is just programmers saying 'have you tried turning it off and on again.'", author: "Developer Folklore", category: "software" },
  { text: "Premature optimization is the root of all evil.", author: "Donald Knuth", category: "software" },

]

// ─── Category weights for AI selection ───────────────────────────────────────
const WEIGHTS = {
  stoicism:    0.20,
  science:     0.20,
  comedian:    0.20,
  movie:       0.15,
  software:    0.15,
  motivational: 0.10,
}

// ─── Weighted candidate selector ─────────────────────────────────────────────
// Returns ~30 quotes for the AI to choose from, weighted by category,
// filtered to exclude quotes used in the last 30 days.
export function selectCandidates(recentQuoteTexts = [], count = 30) {
  const recentSet = new Set(recentQuoteTexts.filter(Boolean).map(t => t.toLowerCase()))

  // Group available (non-recent) quotes by category
  const byCategory = {}
  for (const q of QUOTE_POOL) {
    if (recentSet.has(q.text.toLowerCase())) continue
    if (!byCategory[q.category]) byCategory[q.category] = []
    byCategory[q.category].push(q)
  }

  // Pick proportional sample from each category
  const candidates = []
  for (const [cat, weight] of Object.entries(WEIGHTS)) {
    const pool = byCategory[cat] ?? []
    const n = Math.max(1, Math.round(count * weight))
    const shuffled = [...pool].sort(() => Math.random() - 0.5)
    candidates.push(...shuffled.slice(0, n))
  }

  return candidates.sort(() => Math.random() - 0.5)
}

// ─── Random pool pick (for skip) ─────────────────────────────────────────────
export function pickRandom(excludeText = '') {
  const available = QUOTE_POOL.filter(q => q.text !== excludeText)
  return available[Math.floor(Math.random() * available.length)]
}
