// Curated from a published wellness-quotes article; sourceUrl is the page each quote appears on.
const quotes = [
  {
    text: 'Rest when you’re weary. Refresh and renew yourself, your body, your mind, your spirit. Then get back to work.',
    author: 'Ralph Marston',
    sourceUrl: 'https://uoflhealth.org/articles/15-quotes-to-help-inspire-all-around-wellness-in-2015/',
  },
  {
    text: 'We must always change, renew, rejuvenate ourselves, otherwise we harden.',
    author: 'Johann Wolfgang von Goethe',
    sourceUrl: 'https://uoflhealth.org/articles/15-quotes-to-help-inspire-all-around-wellness-in-2015/',
  },
  {
    text: 'It’s not about perfect. It’s about effort. And when you bring that effort every single day, that’s where transformation happens.',
    author: 'Jillian Michaels',
    sourceUrl: 'https://uoflhealth.org/articles/15-quotes-to-help-inspire-all-around-wellness-in-2015/',
  },
  {
    text: 'You must do the thing you think you cannot do.',
    author: 'Eleanor Roosevelt',
    sourceUrl: 'https://uoflhealth.org/articles/15-quotes-to-help-inspire-all-around-wellness-in-2015/',
  },
  {
    text: 'To insure good health: eat lightly, breathe deeply, live moderately, cultivate cheerfulness, and maintain an interest in life.',
    author: 'William Londen',
    sourceUrl: 'https://uoflhealth.org/articles/15-quotes-to-help-inspire-all-around-wellness-in-2015/',
  },
  {
    text: 'Physical fitness is not only one of the most important keys to a healthy body, it is the basis of dynamic and creative intellectual activity.',
    author: 'John F. Kennedy',
    sourceUrl: 'https://uoflhealth.org/articles/15-quotes-to-help-inspire-all-around-wellness-in-2015/',
  },
  {
    text: 'Health is a state of complete physical, mental and social well-being, and not merely the absence of disease or infirmity.',
    author: 'World Health Organization',
    sourceUrl: 'https://uoflhealth.org/articles/15-quotes-to-help-inspire-all-around-wellness-in-2015/',
  },
  {
    text: 'Believe you can and you’re halfway there.',
    author: 'Theodore Roosevelt',
    sourceUrl: 'https://uoflhealth.org/articles/15-quotes-to-help-inspire-all-around-wellness-in-2015/',
  },
  {
    text: 'Ability is what you’re capable of doing. Motivation determines what you do. Attitude determines how well you do it.',
    author: 'Lou Holtz',
    sourceUrl: 'https://uoflhealth.org/articles/15-quotes-to-help-inspire-all-around-wellness-in-2015/',
  },
  {
    text: 'The beginning is the most important part of the work.',
    author: 'Plato',
    sourceUrl: 'https://uoflhealth.org/articles/15-quotes-to-help-inspire-all-around-wellness-in-2015/',
  },
  {
    text: 'What you get by achieving your goal is not as important as what you become by achieving your goals.',
    author: 'Henry David Thoreau',
    sourceUrl: 'https://uoflhealth.org/articles/15-quotes-to-help-inspire-all-around-wellness-in-2015/',
  },
  {
    text: 'Nothing is impossible. The word itself says “I’m possible.”',
    author: 'Audrey Hepburn',
    sourceUrl: 'https://uoflhealth.org/articles/15-quotes-to-help-inspire-all-around-wellness-in-2015/',
  },
  {
    text: 'Change doesn’t come in nickels and dimes. It comes in dedication and sweat.',
    author: 'Toni Sorenson',
    sourceUrl: 'https://uoflhealth.org/articles/15-quotes-to-help-inspire-all-around-wellness-in-2015/',
  },
  {
    text: 'The first wealth is health.',
    author: 'Ralph Waldo Emerson',
    sourceUrl: 'https://theinspiringjournal.com/health-and-wellness-quotes/',
  },
  {
    text: 'If you don’t make time for exercise, you’ll probably have to make time for illness.',
    author: 'Robin Sharma',
    sourceUrl: 'https://theinspiringjournal.com/health-and-wellness-quotes/',
  },
  {
    text: 'Health is not valued till sickness comes.',
    author: 'Thomas Fuller',
    sourceUrl: 'https://theinspiringjournal.com/health-and-wellness-quotes/',
  },
  {
    text: 'He who has health has hope; and he who has hope, has everything.',
    author: 'Thomas Carlyle',
    sourceUrl: 'https://theinspiringjournal.com/health-and-wellness-quotes/',
  },
  {
    text: 'The man who earns a million, but destroys his health in the process is not really a success.',
    author: 'Zig Ziglar',
    sourceUrl: 'https://theinspiringjournal.com/health-and-wellness-quotes/',
  },
  {
    text: 'Prevention is better than cure.',
    author: 'Desiderius Erasmus',
    sourceUrl: 'https://theinspiringjournal.com/health-and-wellness-quotes/',
  },
  {
    text: 'Sleep is the best meditation.',
    author: 'Dalai Lama',
    sourceUrl: 'https://theinspiringjournal.com/health-and-wellness-quotes/',
  },
  {
    text: 'Physical fitness is the first requisite of happiness.',
    author: 'Joseph Pilates',
    sourceUrl: 'https://theinspiringjournal.com/health-and-wellness-quotes/',
  },
  {
    text: 'Take care of your body. It’s the only place you have to live.',
    author: 'Jim Rohn',
    sourceUrl: 'https://theinspiringjournal.com/health-and-wellness-quotes/',
  },
  {
    text: 'A healthy outside starts from the inside.',
    author: 'Robert Urich',
    sourceUrl: 'https://theinspiringjournal.com/health-and-wellness-quotes/',
  },
  {
    text: 'It is health that is real wealth and not pieces of gold and silver.',
    author: 'Mahatma Gandhi',
    sourceUrl: 'https://theinspiringjournal.com/health-and-wellness-quotes/',
  },
  {
    text: 'There is no health without mental health; mental health is too important to be left to the professionals alone, and mental health is everyone’s business.',
    author: 'Vikram Patel',
    sourceUrl: 'https://info.totalwellnesshealth.com/blog/quotes-on-wellness-and-health',
  },
  {
    text: 'Self-care is not selfish. You cannot serve from an empty vessel.',
    author: 'Eleanor Brown',
    sourceUrl: 'https://info.totalwellnesshealth.com/blog/quotes-on-wellness-and-health',
  },
  {
    text: 'The key to a healthy life is having a healthy mind.',
    author: 'Richard Davidson',
    sourceUrl: 'https://info.totalwellnesshealth.com/blog/quotes-on-wellness-and-health',
  },
  {
    text: 'I have chosen to be happy because it is good for my health.',
    author: 'Voltaire',
    sourceUrl: 'https://info.totalwellnesshealth.com/blog/quotes-on-wellness-and-health',
  },
  {
    text: 'Let thy food be thy medicine and thy medicine be thy food.',
    author: 'Hippocrates',
    sourceUrl: 'https://info.totalwellnesshealth.com/blog/quotes-on-wellness-and-health',
  },
  {
    text: 'Those who have no time for healthy eating will sooner or later have to find the time for illness.',
    author: 'Edward Stanley',
    sourceUrl: 'https://info.totalwellnesshealth.com/blog/quotes-on-wellness-and-health',
  },
];

export default quotes;
