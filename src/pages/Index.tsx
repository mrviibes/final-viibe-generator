import { useState, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, AlertCircle, ArrowLeft, ArrowRight, X } from "lucide-react";
import { openAIService, OpenAISearchResult } from "@/lib/openai";
import { ApiKeyDialog } from "@/components/ApiKeyDialog";
import { StepProgress } from "@/components/StepProgress";
const styleOptions = [{
  id: "celebrations",
  name: "Celebrations",
  description: "Holidays, milestones, special occasions"
}, {
  id: "sports",
  name: "Sports",
  description: "All sports, activities, and competitions"
}, {
  id: "daily-life",
  name: "Daily Life",
  description: "Everyday routines, hobbies, and situations"
}, {
  id: "vibes-punchlines",
  name: "Vibes & Punchlines",
  description: "Moods, self-talk, jokes, and formats"
}, {
  id: "pop-culture",
  name: "Pop Culture",
  description: "Movies, music, celebrities, trends"
}, {
  id: "random",
  name: "No Category",
  description: "Build from scratch"
}];
const celebrationOptions = [{
  id: "birthday",
  name: "Birthday"
}, {
  id: "christmas-day",
  name: "Christmas Day"
}, {
  id: "thanksgiving-us",
  name: "Thanksgiving (United States)"
}, {
  id: "new-years-eve",
  name: "New Year's Eve"
}, {
  id: "christmas-eve",
  name: "Christmas Eve"
}, {
  id: "halloween",
  name: "Halloween"
}, {
  id: "mothers-day",
  name: "Mother's Day"
}, {
  id: "fathers-day",
  name: "Father's Day"
}, {
  id: "independence-day-us",
  name: "Independence Day (United States)"
}, {
  id: "new-years-day",
  name: "New Year's Day"
}, {
  id: "easter",
  name: "Easter"
}, {
  id: "memorial-day-us",
  name: "Memorial Day (United States)"
}, {
  id: "valentines-day",
  name: "Valentine's Day"
}, {
  id: "wedding",
  name: "Wedding"
}, {
  id: "wedding-anniversary",
  name: "Wedding Anniversary"
}, {
  id: "high-school-graduation",
  name: "High School Graduation"
}, {
  id: "college-graduation",
  name: "College Graduation"
}, {
  id: "baby-shower",
  name: "Baby Shower"
}, {
  id: "bridal-shower",
  name: "Bridal Shower"
}, {
  id: "bachelor-party",
  name: "Bachelor Party"
}, {
  id: "bachelorette-party",
  name: "Bachelorette Party"
}, {
  id: "engagement-party",
  name: "Engagement Party"
}, {
  id: "housewarming-party",
  name: "Housewarming Party"
}, {
  id: "retirement-party",
  name: "Retirement Party"
}, {
  id: "job-promotion-celebration",
  name: "Job Promotion Celebration"
}, {
  id: "farewell-party",
  name: "Farewell Party (Going Away Party)"
}, {
  id: "babys-first-birthday",
  name: "Baby's First Birthday"
}, {
  id: "sweet-16-birthday",
  name: "Sweet 16 Birthday"
}, {
  id: "quinceanera",
  name: "Quinceañera"
}, {
  id: "bar-mitzvah",
  name: "Bar Mitzvah"
}, {
  id: "bat-mitzvah",
  name: "Bat Mitzvah"
}, {
  id: "gender-reveal-party",
  name: "Gender Reveal Party"
}, {
  id: "christening-baptism",
  name: "Christening / Baptism"
}, {
  id: "first-communion",
  name: "First Communion"
}, {
  id: "confirmation",
  name: "Confirmation"
}, {
  id: "hanukkah",
  name: "Hanukkah"
}, {
  id: "kwanzaa",
  name: "Kwanzaa"
}, {
  id: "diwali",
  name: "Diwali (Deepavali)"
}, {
  id: "chinese-new-year",
  name: "Chinese New Year (Lunar New Year)"
}, {
  id: "saint-patricks-day",
  name: "Saint Patrick's Day"
}, {
  id: "labor-day",
  name: "Labor Day"
}, {
  id: "veterans-day-us",
  name: "Veterans Day (United States)"
}, {
  id: "martin-luther-king-jr-day",
  name: "Martin Luther King Jr. Day"
}, {
  id: "juneteenth",
  name: "Juneteenth"
}, {
  id: "cinco-de-mayo",
  name: "Cinco de Mayo"
}, {
  id: "mardi-gras",
  name: "Mardi Gras"
}, {
  id: "good-friday",
  name: "Good Friday"
}, {
  id: "passover",
  name: "Passover"
}, {
  id: "eid-al-fitr",
  name: "Eid al-Fitr"
}, {
  id: "eid-al-adha",
  name: "Eid al-Adha"
}, {
  id: "nowruz",
  name: "Nowruz (Persian New Year)"
}, {
  id: "purim",
  name: "Purim"
}, {
  id: "rosh-hashanah",
  name: "Rosh Hashanah"
}, {
  id: "holi",
  name: "Holi"
}, {
  id: "navratri",
  name: "Navratri"
}, {
  id: "durga-puja",
  name: "Durga Puja"
}, {
  id: "lohri",
  name: "Lohri"
}, {
  id: "vaisakhi",
  name: "Vaisakhi (Baisakhi)"
}, {
  id: "onam",
  name: "Onam"
}, {
  id: "raksha-bandhan",
  name: "Raksha Bandhan"
}, {
  id: "janmashtami",
  name: "Janmashtami"
}, {
  id: "ganesh-chaturthi",
  name: "Ganesh Chaturthi"
}, {
  id: "guru-nanak-gurpurab",
  name: "Guru Nanak Gurpurab"
}, {
  id: "pride",
  name: "Pride (LGBTQ+ Pride events)"
}, {
  id: "earth-day",
  name: "Earth Day"
}, {
  id: "groundhog-day",
  name: "Groundhog Day"
}, {
  id: "super-bowl-sunday",
  name: "Super Bowl Sunday"
}, {
  id: "boxing-day",
  name: "Boxing Day"
}, {
  id: "canada-day",
  name: "Canada Day"
}, {
  id: "victoria-day-canada",
  name: "Victoria Day (Canada)"
}, {
  id: "saint-jean-baptiste-day",
  name: "Saint-Jean-Baptiste Day (Quebec)"
}, {
  id: "remembrance-day-canada",
  name: "Remembrance Day (Canada)"
}, {
  id: "columbus-day",
  name: "Columbus Day / Indigenous Peoples' Day (U.S.)"
}, {
  id: "international-womens-day",
  name: "International Women's Day"
}, {
  id: "international-mens-day",
  name: "International Men's Day"
}, {
  id: "international-friendship-day",
  name: "International Friendship Day"
}, {
  id: "boss-day",
  name: "Boss's Day"
}, {
  id: "administrative-professionals-day",
  name: "Administrative Professionals' Day"
}, {
  id: "april-fools-day",
  name: "April Fools' Day"
}, {
  id: "star-wars-day",
  name: "Star Wars Day (May 4th)"
}, {
  id: "oktoberfest",
  name: "Oktoberfest"
}, {
  id: "caribbean-carnival",
  name: "Caribbean Carnival (e.g., Caribana festival)"
}, {
  id: "day-of-the-dead",
  name: "Day of the Dead (Día de los Muertos)"
}, {
  id: "mid-autumn-festival",
  name: "Mid-Autumn Festival (Moon Festival)"
}, {
  id: "arbor-day",
  name: "Arbor Day"
}, {
  id: "orthodox-christmas",
  name: "Orthodox Christmas (Jan 7)"
}, {
  id: "orthodox-easter",
  name: "Orthodox Easter"
}, {
  id: "21st-birthday",
  name: "21st Birthday"
}, {
  id: "50th-birthday",
  name: "50th Birthday"
}, {
  id: "100th-birthday",
  name: "100th Birthday"
}, {
  id: "25th-wedding-anniversary",
  name: "25th Wedding Anniversary"
}, {
  id: "50th-wedding-anniversary",
  name: "50th Wedding Anniversary"
}, {
  id: "babys-1-month-celebration",
  name: "Baby's 1 Month Celebration"
}, {
  id: "babys-100-days-celebration",
  name: "Baby's 100 Days Celebration"
}, {
  id: "baby-sprinkle",
  name: "Baby Sprinkle (Second Baby Shower)"
}, {
  id: "bris",
  name: "Bris (Brit Milah)"
}, {
  id: "baby-naming-ceremony",
  name: "Baby Naming Ceremony"
}, {
  id: "adoption-day",
  name: "Adoption Day (Child Adoption)"
}, {
  id: "pets-birthday",
  name: "Pet's Birthday"
}, {
  id: "pet-adoption-day",
  name: "Pet Adoption Day (Gotcha Day)"
}, {
  id: "las-posadas",
  name: "Las Posadas"
}, {
  id: "three-kings-day",
  name: "Three Kings Day (Día de Reyes)"
}, {
  id: "dragon-boat-festival",
  name: "Dragon Boat Festival"
}, {
  id: "saint-nicholas-day",
  name: "Saint Nicholas Day"
}, {
  id: "krampusnacht",
  name: "Krampusnacht"
}, {
  id: "talk-like-a-pirate-day",
  name: "Talk Like a Pirate Day"
}, {
  id: "pi-day",
  name: "Pi Day (March 14)"
}, {
  id: "420",
  name: "4/20 (Cannabis Culture Day)"
}, {
  id: "siblings-day",
  name: "Siblings Day"
}, {
  id: "grandparents-day",
  name: "Grandparents Day"
}, {
  id: "mother-in-law-day",
  name: "Mother-in-Law Day"
}, {
  id: "national-boyfriend-day",
  name: "National Boyfriend Day"
}, {
  id: "national-girlfriend-day",
  name: "National Girlfriend Day"
}, {
  id: "national-pet-day",
  name: "National Pet Day"
}, {
  id: "national-dog-day",
  name: "National Dog Day"
}, {
  id: "national-cat-day",
  name: "National Cat Day"
}, {
  id: "international-beer-day",
  name: "International Beer Day"
}, {
  id: "international-coffee-day",
  name: "International Coffee Day"
}, {
  id: "national-donut-day",
  name: "National Donut Day"
}, {
  id: "national-ice-cream-day",
  name: "National Ice Cream Day"
}, {
  id: "national-pizza-day",
  name: "National Pizza Day"
}, {
  id: "festivus",
  name: "Festivus"
}, {
  id: "national-son-day",
  name: "National Son Day"
}, {
  id: "national-daughter-day",
  name: "National Daughter Day"
}, {
  id: "national-cousins-day",
  name: "National Cousins Day"
}, {
  id: "national-best-friends-day",
  name: "National Best Friends Day"
}, {
  id: "national-wine-day",
  name: "National Wine Day"
}, {
  id: "national-margarita-day",
  name: "National Margarita Day"
}, {
  id: "national-pancake-day",
  name: "National Pancake Day"
}, {
  id: "national-cookie-day",
  name: "National Cookie Day"
}, {
  id: "national-burger-day",
  name: "National Burger Day"
}, {
  id: "national-taco-day",
  name: "National Taco Day"
}, {
  id: "national-pie-day",
  name: "National Pie Day"
}, {
  id: "national-hot-dog-day",
  name: "National Hot Dog Day"
}, {
  id: "presidents-day",
  name: "Presidents' Day (U.S.)"
}, {
  id: "leap-day",
  name: "Leap Day (Feb 29)"
}, {
  id: "galentines-day",
  name: "Galentine's Day"
}, {
  id: "summer-solstice",
  name: "Summer Solstice"
}, {
  id: "winter-solstice",
  name: "Winter Solstice"
}, {
  id: "midsummer",
  name: "Midsummer (Summer Festival)"
}, {
  id: "bastille-day",
  name: "Bastille Day (French National Day)"
}, {
  id: "pioneer-day",
  name: "Pioneer Day (Utah)"
}, {
  id: "lammas",
  name: "Lammas (Lughnasadh)"
}, {
  id: "left-handers-day",
  name: "Left-Handers Day"
}, {
  id: "mexican-independence-day",
  name: "Mexican Independence Day"
}, {
  id: "spring-equinox",
  name: "Spring Equinox"
}, {
  id: "autumn-equinox",
  name: "Autumn Equinox"
}, {
  id: "thanksgiving-canada",
  name: "Thanksgiving (Canada)"
}, {
  id: "simchat-torah",
  name: "Simchat Torah"
}, {
  id: "bodhi-day",
  name: "Bodhi Day"
}, {
  id: "vesak",
  name: "Vesak (Buddha's Birthday)"
}, {
  id: "chuseok",
  name: "Chuseok (Korean Harvest Festival)"
}, {
  id: "obon",
  name: "Obon (Japanese Festival of Ancestors)"
}, {
  id: "imbolc",
  name: "Imbolc"
}, {
  id: "international-workers-day",
  name: "International Workers' Day (May Day)"
}, {
  id: "beltane",
  name: "Beltane (May Day Festival)"
}, {
  id: "polar-bear-plunge-day",
  name: "Polar Bear Plunge Day"
}, {
  id: "chocolate-cake-day",
  name: "Chocolate Cake Day"
}, {
  id: "national-cheesecake-day",
  name: "National Cheesecake Day"
}, {
  id: "national-candy-day",
  name: "National Candy Day"
}, {
  id: "chocolate-chip-cookie-day",
  name: "Chocolate Chip Cookie Day"
}, {
  id: "mac-and-cheese-day",
  name: "Mac and Cheese Day"
}, {
  id: "national-cocktail-day",
  name: "National Cocktail Day"
}, {
  id: "international-tea-day",
  name: "International Tea Day"
}, {
  id: "world-milk-day",
  name: "World Milk Day"
}, {
  id: "national-dessert-day",
  name: "National Dessert Day"
}, {
  id: "national-cake-day",
  name: "National Cake Day"
}, {
  id: "national-sandwich-day",
  name: "National Sandwich Day"
}, {
  id: "national-burrito-day",
  name: "National Burrito Day"
}, {
  id: "national-fried-chicken-day",
  name: "National Fried Chicken Day"
}, {
  id: "national-bagel-day",
  name: "National Bagel Day"
}, {
  id: "national-milkshake-day",
  name: "National Milkshake Day"
}, {
  id: "cinnamon-roll-day",
  name: "Cinnamon Roll Day"
}, {
  id: "national-brownie-day",
  name: "National Brownie Day"
}, {
  id: "national-peanut-butter-day",
  name: "National Peanut Butter Day"
}, {
  id: "national-jelly-bean-day",
  name: "National Jelly Bean Day"
}, {
  id: "national-potato-day",
  name: "National Potato Day"
}, {
  id: "geek-pride-day",
  name: "Geek Pride Day"
}, {
  id: "system-administrator-appreciation-day",
  name: "System Administrator Appreciation Day"
}, {
  id: "mole-day",
  name: "Mole Day"
}, {
  id: "record-store-day",
  name: "Record Store Day"
}, {
  id: "national-coming-out-day",
  name: "National Coming Out Day"
}, {
  id: "world-oceans-day",
  name: "World Oceans Day"
}, {
  id: "international-museum-day",
  name: "International Museum Day"
}, {
  id: "knit-in-public-day",
  name: "Knit in Public Day"
}, {
  id: "singles-awareness-day",
  name: "Singles Awareness Day"
}, {
  id: "bloomsday",
  name: "Bloomsday"
}, {
  id: "talk-like-yoda-day",
  name: "Talk Like Yoda Day"
}, {
  id: "caps-lock-day",
  name: "Caps Lock Day"
}, {
  id: "pretend-to-be-a-time-traveler-day",
  name: "Pretend to Be a Time Traveler Day"
}, {
  id: "world-hello-day",
  name: "World Hello Day"
}, {
  id: "no-pants-day",
  name: "No Pants Day"
}, {
  id: "trivia-day",
  name: "Trivia Day"
}, {
  id: "compliment-day",
  name: "Compliment Day"
}, {
  id: "puzzle-day",
  name: "Puzzle Day"
}, {
  id: "backwards-day",
  name: "Backwards Day"
}, {
  id: "eat-ice-cream-for-breakfast-day",
  name: "Eat Ice Cream for Breakfast Day"
}, {
  id: "play-your-ukulele-day",
  name: "Play Your Ukulele Day"
}, {
  id: "thank-your-mailman-day",
  name: "Thank Your Mailman Day"
}, {
  id: "darwin-day",
  name: "Darwin Day"
}, {
  id: "random-acts-of-kindness-day",
  name: "Random Acts of Kindness Day"
}, {
  id: "love-your-pet-day",
  name: "Love Your Pet Day"
}, {
  id: "grilled-cheese-day",
  name: "Grilled Cheese Day"
}, {
  id: "wear-pajamas-to-work-day",
  name: "Wear Pajamas to Work Day"
}, {
  id: "superhero-day",
  name: "Superhero Day"
}, {
  id: "international-picnic-day",
  name: "International Picnic Day"
}, {
  id: "go-skateboarding-day",
  name: "Go Skateboarding Day"
}, {
  id: "social-media-day",
  name: "Social Media Day"
}, {
  id: "moon-day",
  name: "Moon Day"
}, {
  id: "national-avocado-day",
  name: "National Avocado Day"
}, {
  id: "book-lovers-day",
  name: "Book Lovers Day"
}, {
  id: "relaxation-day",
  name: "Relaxation Day"
}, {
  id: "tell-a-joke-day",
  name: "Tell a Joke Day"
}, {
  id: "womens-equality-day",
  name: "Women's Equality Day"
}, {
  id: "programmers-day",
  name: "Programmers' Day"
}, {
  id: "opposite-day",
  name: "Opposite Day"
}, {
  id: "ugly-christmas-sweater-day",
  name: "Ugly Christmas Sweater Day"
}, {
  id: "bacon-day",
  name: "Bacon Day"
}, {
  id: "divorce-party",
  name: "Divorce Party"
}, {
  id: "debut",
  name: "Debut (Filipino 18th Birthday)"
}, {
  id: "burns-night",
  name: "Burns Night"
}, {
  id: "cherry-blossom-festival",
  name: "Cherry Blossom Festival (Hanami)"
}, {
  id: "ayyam-i-ha",
  name: "Ayyám-i-Há (Bahá'í Festival)"
}, {
  id: "science-fiction-day",
  name: "Science Fiction Day"
}, {
  id: "nothing-day",
  name: "Nothing Day"
}, {
  id: "popcorn-day",
  name: "Popcorn Day"
}, {
  id: "hot-sauce-day",
  name: "Hot Sauce Day"
}, {
  id: "ditch-new-years-resolution-day",
  name: "Ditch New Year's Resolution Day"
}, {
  id: "lost-sock-memorial-day",
  name: "Lost Sock Memorial Day"
}, {
  id: "twilight-zone-day",
  name: "Twilight Zone Day"
}, {
  id: "eat-what-you-want-day",
  name: "Eat What You Want Day"
}, {
  id: "limerick-day",
  name: "Limerick Day"
}, {
  id: "dance-like-a-chicken-day",
  name: "Dance Like a Chicken Day"
}, {
  id: "pizza-party-day",
  name: "Pizza Party Day"
}, {
  id: "no-dirty-dishes-day",
  name: "No Dirty Dishes Day"
}, {
  id: "scavenger-hunt-day",
  name: "Scavenger Hunt Day"
}, {
  id: "say-something-nice-day",
  name: "Say Something Nice Day"
}, {
  id: "leave-the-office-early-day",
  name: "Leave the Office Early Day"
}, {
  id: "repeat-day",
  name: "Repeat Day"
}, {
  id: "hug-your-cat-day",
  name: "Hug Your Cat Day"
}, {
  id: "drive-in-movie-day",
  name: "Drive-In Movie Day"
}, {
  id: "donald-duck-day",
  name: "Donald Duck Day"
}, {
  id: "iced-tea-day",
  name: "Iced Tea Day"
}, {
  id: "bourbon-day",
  name: "Bourbon Day"
}, {
  id: "eat-your-vegetables-day",
  name: "Eat Your Vegetables Day"
}, {
  id: "take-your-dog-to-work-day",
  name: "Take Your Dog to Work Day"
}, {
  id: "onion-ring-day",
  name: "Onion Ring Day"
}, {
  id: "tau-day",
  name: "Tau Day"
}, {
  id: "camera-day",
  name: "Camera Day"
}, {
  id: "meteor-watch-day",
  name: "Meteor Watch Day"
}, {
  id: "world-kissing-day",
  name: "World Kissing Day"
}, {
  id: "tell-the-truth-day",
  name: "Tell the Truth Day"
}, {
  id: "teddy-bears-picnic-day",
  name: "Teddy Bears' Picnic Day"
}, {
  id: "cheer-up-the-lonely-day",
  name: "Cheer Up the Lonely Day"
}, {
  id: "stick-out-your-tongue-day",
  name: "Stick Out Your Tongue Day"
}, {
  id: "junk-food-day",
  name: "Junk Food Day"
}, {
  id: "pi-approximation-day",
  name: "Pi Approximation Day"
}, {
  id: "aunt-and-uncle-day",
  name: "Aunt and Uncle Day"
}, {
  id: "lasagna-day",
  name: "Lasagna Day"
}, {
  id: "ice-cream-sandwich-day",
  name: "Ice Cream Sandwich Day"
}, {
  id: "sisters-day",
  name: "Sisters' Day"
}, {
  id: "watermelon-day",
  name: "Watermelon Day"
}, {
  id: "lazy-day",
  name: "Lazy Day"
}, {
  id: "middle-child-day",
  name: "Middle Child Day"
}, {
  id: "creamsicle-day",
  name: "Creamsicle Day"
}, {
  id: "world-photo-day",
  name: "World Photo Day"
}, {
  id: "pluto-demoted-day",
  name: "Pluto Demoted Day"
}, {
  id: "kiss-and-make-up-day",
  name: "Kiss and Make Up Day"
}, {
  id: "bow-tie-day",
  name: "Bow Tie Day"
}, {
  id: "frankenstein-day",
  name: "Frankenstein Day"
}, {
  id: "eat-outside-day",
  name: "Eat Outside Day"
}, {
  id: "eat-an-extra-dessert-day",
  name: "Eat an Extra Dessert Day"
}, {
  id: "be-late-for-something-day",
  name: "Be Late for Something Day"
}, {
  id: "cheese-pizza-day",
  name: "Cheese Pizza Day"
}, {
  id: "read-a-book-day",
  name: "Read a Book Day"
}, {
  id: "teddy-bear-day",
  name: "Teddy Bear Day"
}, {
  id: "positive-thinking-day",
  name: "Positive Thinking Day"
}, {
  id: "roald-dahl-day",
  name: "Roald Dahl Day"
}, {
  id: "hug-your-hound-day",
  name: "Hug Your Hound Day"
}, {
  id: "guacamole-day",
  name: "Guacamole Day"
}, {
  id: "miniature-golf-day",
  name: "Miniature Golf Day"
}, {
  id: "punctuation-day",
  name: "Punctuation Day"
}, {
  id: "national-comic-book-day",
  name: "National Comic Book Day"
}, {
  id: "love-note-day",
  name: "Love Note Day"
}, {
  id: "ask-a-stupid-question-day",
  name: "Ask a Stupid Question Day"
}, {
  id: "card-making-day",
  name: "Card Making Day"
}, {
  id: "mad-hatter-day",
  name: "Mad Hatter Day"
}, {
  id: "its-my-party-day",
  name: "It's My Party Day"
}, {
  id: "ada-lovelace-day",
  name: "Ada Lovelace Day"
}, {
  id: "i-love-lucy-day",
  name: "I Love Lucy Day"
}, {
  id: "dictionary-day",
  name: "Dictionary Day"
}, {
  id: "wear-something-gaudy-day",
  name: "Wear Something Gaudy Day"
}, {
  id: "international-sloth-day",
  name: "International Sloth Day"
}, {
  id: "howl-at-the-moon-day",
  name: "Howl at the Moon Day"
}, {
  id: "american-beer-day",
  name: "American Beer Day"
}, {
  id: "international-animation-day",
  name: "International Animation Day"
}, {
  id: "internet-day",
  name: "Internet Day"
}, {
  id: "candy-corn-day",
  name: "Candy Corn Day"
}, {
  id: "magic-day",
  name: "Magic Day"
}, {
  id: "authors-day",
  name: "Author's Day"
}, {
  id: "zero-tasking-day",
  name: "Zero Tasking Day"
}, {
  id: "men-make-dinner-day",
  name: "Men Make Dinner Day"
}, {
  id: "international-stout-day",
  name: "International Stout Day"
}, {
  id: "tongue-twister-day",
  name: "Tongue Twister Day"
}, {
  id: "happy-hour-day",
  name: "Happy Hour Day"
}, {
  id: "world-kindness-day",
  name: "World Kindness Day"
}, {
  id: "sadie-hawkins-day",
  name: "Sadie Hawkins Day"
}, {
  id: "fast-food-day",
  name: "Fast Food Day"
}, {
  id: "take-a-hike-day",
  name: "Take a Hike Day"
}, {
  id: "absurdity-day",
  name: "Absurdity Day"
}, {
  id: "fibonacci-day",
  name: "Fibonacci Day"
}, {
  id: "celebrate-your-unique-talent-day",
  name: "Celebrate Your Unique Talent Day"
}, {
  id: "red-planet-day",
  name: "Red Planet Day"
}, {
  id: "make-a-gift-day",
  name: "Make a Gift Day"
}, {
  id: "day-of-the-ninja",
  name: "Day of the Ninja"
}, {
  id: "letter-writing-day",
  name: "Letter Writing Day"
}, {
  id: "christmas-card-day",
  name: "Christmas Card Day"
}, {
  id: "gingerbread-house-day",
  name: "Gingerbread House Day"
}, {
  id: "monkey-day",
  name: "Monkey Day"
}, {
  id: "free-shipping-day",
  name: "Free Shipping Day"
}, {
  id: "chocolate-covered-anything-day",
  name: "Chocolate Covered Anything Day"
}, {
  id: "wright-brothers-day",
  name: "Wright Brothers Day"
}, {
  id: "dalek-day",
  name: "Dalek Day"
}, {
  id: "eggnog-day",
  name: "Eggnog Day"
}, {
  id: "card-playing-day",
  name: "Card Playing Day"
}, {
  id: "make-up-your-mind-day",
  name: "Make Up Your Mind Day"
}, {
  id: "buffet-day",
  name: "Buffet Day"
}, {
  id: "run-it-up-the-flagpole-day",
  name: "\"Run It up the Flagpole\" Day"
}, {
  id: "fruitcake-toss-day",
  name: "Fruitcake Toss Day"
}, {
  id: "festival-of-sleep-day",
  name: "Festival of Sleep Day"
}, {
  id: "bird-day",
  name: "Bird Day"
}, {
  id: "bean-day",
  name: "Bean Day"
}, {
  id: "old-rock-day",
  name: "Old Rock Day"
}, {
  id: "earths-rotation-day",
  name: "Earth's Rotation Day"
}, {
  id: "static-electricity-day",
  name: "Static Electricity Day"
}, {
  id: "word-nerd-day",
  name: "Word Nerd Day"
}, {
  id: "cut-your-energy-costs-day",
  name: "Cut Your Energy Costs Day"
}, {
  id: "learn-your-name-in-morse-code-day",
  name: "Learn Your Name in Morse Code Day"
}, {
  id: "organize-your-home-day",
  name: "Organize Your Home Day"
}, {
  id: "strawberry-ice-cream-day",
  name: "Strawberry Ice Cream Day"
}, {
  id: "bagel-and-lox-day",
  name: "Bagel and Lox Day"
}, {
  id: "benjamin-franklin-day",
  name: "Benjamin Franklin Day"
}, {
  id: "kid-inventors-day",
  name: "Kid Inventors' Day"
}, {
  id: "soup-swap-day",
  name: "Soup Swap Day"
}, {
  id: "thesaurus-day",
  name: "Thesaurus Day"
}, {
  id: "tin-can-day",
  name: "Tin Can Day"
}, {
  id: "penguin-awareness-day",
  name: "Penguin Awareness Day"
}, {
  id: "squirrel-appreciation-day",
  name: "Squirrel Appreciation Day"
}, {
  id: "answer-your-cats-questions-day",
  name: "Answer Your Cat's Questions Day"
}, {
  id: "handwriting-day",
  name: "Handwriting Day"
}, {
  id: "macintosh-computer-day",
  name: "Macintosh Computer Day"
}, {
  id: "croissant-day",
  name: "Croissant Day"
}, {
  id: "day-of-the-crepe",
  name: "Day of the Crêpe"
}, {
  id: "carrot-cake-day",
  name: "Carrot Cake Day"
}, {
  id: "create-a-vacuum-day",
  name: "Create a Vacuum Day"
}, {
  id: "stuffed-mushroom-day",
  name: "Stuffed Mushroom Day"
}, {
  id: "national-weatherperson-day",
  name: "National Weatherperson's Day"
}, {
  id: "chocolate-fondue-day",
  name: "Chocolate Fondue Day"
}, {
  id: "lame-duck-day",
  name: "Lame Duck Day"
}, {
  id: "work-naked-day",
  name: "Work Naked Day"
}, {
  id: "send-a-card-to-a-friend-day",
  name: "Send a Card to a Friend Day"
}, {
  id: "laugh-and-get-rich-day",
  name: "Laugh and Get Rich Day"
}, {
  id: "toothache-day",
  name: "Toothache Day"
}, {
  id: "umbrella-day",
  name: "Umbrella Day"
}, {
  id: "clean-out-your-computer-day",
  name: "Clean Out Your Computer Day"
}, {
  id: "make-a-friend-day",
  name: "Make a Friend Day"
}, {
  id: "dont-cry-over-spilled-milk-day",
  name: "Don't Cry Over Spilled Milk Day"
}, {
  id: "world-radio-day",
  name: "World Radio Day"
}, {
  id: "ferris-wheel-day",
  name: "Ferris Wheel Day"
}, {
  id: "library-lovers-day",
  name: "Library Lovers Day"
}, {
  id: "gumdrop-day",
  name: "Gumdrop Day"
}, {
  id: "do-a-grouch-a-favor-day",
  name: "Do a Grouch a Favor Day"
}, {
  id: "battery-day",
  name: "Battery Day"
}, {
  id: "chocolate-mint-day",
  name: "Chocolate Mint Day"
}, {
  id: "single-tasking-day",
  name: "Single Tasking Day"
}, {
  id: "be-humble-day",
  name: "Be Humble Day"
}, {
  id: "world-sword-swallowers-day",
  name: "World Sword Swallowers Day"
}, {
  id: "international-dog-biscuit-appreciation-day",
  name: "International Dog Biscuit Appreciation Day"
}, {
  id: "tortilla-chip-day",
  name: "Tortilla Chip Day"
}, {
  id: "pistachio-day",
  name: "Pistachio Day"
}, {
  id: "tell-a-fairy-tale-day",
  name: "Tell a Fairy Tale Day"
}, {
  id: "international-polar-bear-day",
  name: "International Polar Bear Day"
}, {
  id: "no-brainer-day",
  name: "No Brainer Day"
}, {
  id: "public-sleeping-day",
  name: "Public Sleeping Day"
}, {
  id: "world-compliment-day",
  name: "World Compliment Day"
}, {
  id: "plan-a-solo-vacation-day",
  name: "Plan a Solo Vacation Day"
}, {
  id: "old-stuff-day",
  name: "Old Stuff Day"
}, {
  id: "i-want-you-to-be-happy-day",
  name: "I Want You to be Happy Day"
}, {
  id: "march-forth-and-do-something-day",
  name: "March Forth and Do Something Day"
}, {
  id: "learn-what-your-name-means-day",
  name: "Learn What Your Name Means Day"
}, {
  id: "cinco-de-marcho",
  name: "Cinco de Marcho"
}, {
  id: "dentists-day",
  name: "Dentist's Day"
}, {
  id: "alexander-graham-bell-day",
  name: "Alexander Graham Bell Day"
}, {
  id: "proofreading-day",
  name: "Proofreading Day"
}, {
  id: "napping-day",
  name: "Napping Day"
}, {
  id: "oatmeal-nut-waffle-day",
  name: "Oatmeal Nut Waffle Day"
}, {
  id: "alfred-hitchcock-day",
  name: "Alfred Hitchcock Day"
}, {
  id: "jewel-day",
  name: "Jewel Day"
}, {
  id: "everything-you-think-is-wrong-day",
  name: "Everything You Think Is Wrong Day"
}, {
  id: "everything-you-do-is-right-day",
  name: "Everything You Do Is Right Day"
}, {
  id: "submarine-day",
  name: "Submarine Day"
}, {
  id: "awkward-moments-day",
  name: "Awkward Moments Day"
}, {
  id: "absolutely-incredible-kid-day",
  name: "Absolutely Incredible Kid Day"
}, {
  id: "world-storytelling-day",
  name: "World Storytelling Day"
}, {
  id: "proposal-day",
  name: "Proposal Day"
}, {
  id: "common-courtesy-day",
  name: "Common Courtesy Day"
}, {
  id: "international-goof-off-day",
  name: "International Goof Off Day"
}, {
  id: "puppy-day",
  name: "Puppy Day"
}, {
  id: "near-miss-day",
  name: "Near Miss Day"
}, {
  id: "chocolate-covered-raisins-day",
  name: "Chocolate Covered Raisins Day"
}, {
  id: "waffle-day",
  name: "Waffle Day"
}, {
  id: "tolkien-reading-day",
  name: "Tolkien Reading Day"
}, {
  id: "make-up-your-own-holiday-day",
  name: "Make Up Your Own Holiday Day"
}, {
  id: "spanish-paella-day",
  name: "Spanish Paella Day"
}, {
  id: "something-on-a-stick-day",
  name: "Something on a Stick Day"
}, {
  id: "smoke-and-mirrors-day",
  name: "Smoke and Mirrors Day"
}, {
  id: "take-a-walk-in-the-park-day",
  name: "Take a Walk in the Park Day"
}, {
  id: "bunsen-burner-day",
  name: "Bunsen Burner Day"
}, {
  id: "world-party-day",
  name: "World Party Day"
}, {
  id: "tell-a-lie-day",
  name: "Tell a Lie Day"
}, {
  id: "walk-to-work-day",
  name: "Walk to Work Day"
}, {
  id: "read-a-road-map-day",
  name: "Read a Road Map Day"
}, {
  id: "first-contact-day",
  name: "First Contact Day"
}, {
  id: "sorry-charlie-day",
  name: "Sorry Charlie Day"
}, {
  id: "be-kind-to-lawyers-day",
  name: "Be Kind to Lawyers Day"
}, {
  id: "barbershop-quartet-day",
  name: "Barbershop Quartet Day"
}, {
  id: "yuris-night",
  name: "Yuri's Night"
}, {
  id: "scrabble-day",
  name: "Scrabble Day"
}, {
  id: "international-moment-of-laughter-day",
  name: "International Moment of Laughter Day"
}, {
  id: "reach-as-high-as-you-can-day",
  name: "Reach as High as You Can Day"
}, {
  id: "look-up-at-the-sky-day",
  name: "Look Up at the Sky Day"
}, {
  id: "eggs-benedict-day",
  name: "Eggs Benedict Day"
}, {
  id: "haiku-poetry-day",
  name: "Haiku Poetry Day"
}, {
  id: "columnist-day",
  name: "Columnist Day"
}, {
  id: "look-alike-day",
  name: "Look Alike Day"
}, {
  id: "jelly-bean-day",
  name: "Jelly Bean Day"
}, {
  id: "take-our-daughters-and-sons-to-work-day",
  name: "Take Our Daughters and Sons to Work Day"
}, {
  id: "dna-day",
  name: "DNA Day"
}, {
  id: "pretzel-day",
  name: "Pretzel Day"
}, {
  id: "richter-scale-day",
  name: "Richter Scale Day"
}, {
  id: "world-pinhole-photography-day",
  name: "World Pinhole Photography Day"
}, {
  id: "zipper-day",
  name: "Zipper Day"
}, {
  id: "honesty-day",
  name: "Honesty Day"
}, {
  id: "batman-day",
  name: "Batman Day"
}, {
  id: "no-pants-day-2",
  name: "No Pants Day"
}, {
  id: "space-day",
  name: "Space Day"
}, {
  id: "astronomy-day",
  name: "Astronomy Day"
}, {
  id: "herb-day",
  name: "Herb Day"
}, {
  id: "square-root-day",
  name: "Square Root Day"
}, {
  id: "beverage-day",
  name: "Beverage Day"
}, {
  id: "national-school-nurse-day",
  name: "National School Nurse Day"
}, {
  id: "europe-day",
  name: "Europe Day"
}, {
  id: "clean-up-your-room-day",
  name: "Clean Up Your Room Day"
}, {
  id: "frog-jumping-day",
  name: "Frog Jumping Day"
}, {
  id: "pack-rat-day",
  name: "Pack Rat Day"
}, {
  id: "may-ray-day",
  name: "May Ray Day"
}, {
  id: "buy-a-musical-instrument-day",
  name: "Buy a Musical Instrument Day"
}, {
  id: "sing-out-day",
  name: "Sing Out Day"
}, {
  id: "world-lindy-hop-day",
  name: "World Lindy Hop Day"
}, {
  id: "sun-screen-day",
  name: "Sun Screen Day"
}, {
  id: "put-a-pillow-on-your-fridge-day",
  name: "Put a Pillow on Your Fridge Day"
}, {
  id: "my-buckets-got-a-hole-day",
  name: "My Bucket's Got a Hole Day"
}, {
  id: "macaroon-day",
  name: "Macaroon Day"
}, {
  id: "vcr-day",
  name: "VCR Day"
}, {
  id: "i-forgot-day",
  name: "I Forgot Day"
}, {
  id: "world-ufo-day",
  name: "World UFO Day"
}, {
  id: "compliment-your-mirror-day",
  name: "Compliment Your Mirror Day"
}, {
  id: "i-forgot-day-again",
  name: "I Forgot Day (Again)"
}, {
  id: "international-plastic-bag-free-day",
  name: "International Plastic Bag Free Day"
}, {
  id: "sidewalk-egg-frying-day",
  name: "Sidewalk Egg Frying Day"
}, {
  id: "workaholics-day",
  name: "Workaholics Day"
}, {
  id: "math-2-0-day",
  name: "Math 2.0 Day"
}, {
  id: "sugar-cookie-day",
  name: "Sugar Cookie Day"
}, {
  id: "clerihew-day",
  name: "Clerihew Day"
}, {
  id: "simplicity-day",
  name: "Simplicity Day"
}, {
  id: "embrace-your-geekness-day",
  name: "Embrace Your Geekness Day"
}, {
  id: "pandemonium-day",
  name: "Pandemonium Day"
}, {
  id: "gummi-worm-day",
  name: "Gummi Worm Day"
}, {
  id: "corn-fritters-day",
  name: "Corn Fritters Day"
}, {
  id: "yellow-pig-day",
  name: "Yellow Pig Day"
}, {
  id: "insurance-nerd-day",
  name: "Insurance Nerd Day"
}, {
  id: "caviar-day",
  name: "Caviar Day"
}, {
  id: "space-exploration-day",
  name: "Space Exploration Day"
}, {
  id: "vanilla-ice-cream-day",
  name: "Vanilla Ice Cream Day"
}, {
  id: "pythagorean-theorem-day",
  name: "Pythagorean Theorem Day"
}, {
  id: "culinarians-day",
  name: "Culinarians Day"
}, {
  id: "take-your-pants-for-a-walk-day",
  name: "Take Your Pants for a Walk Day"
}, {
  id: "uncommon-musical-instrument-day",
  name: "Uncommon Musical Instrument Day"
}, {
  id: "fresh-breath-day",
  name: "Fresh Breath Day"
}, {
  id: "lighthouse-day",
  name: "Lighthouse Day"
}, {
  id: "happiness-happens-day",
  name: "Happiness Happens Day"
}, {
  id: "thrift-shop-day",
  name: "Thrift Shop Day"
}, {
  id: "mail-order-catalog-day",
  name: "Mail Order Catalog Day"
}, {
  id: "stick-out-your-tongue-day-again",
  name: "Stick Out Your Tongue Day (Again)"
}, {
  id: "the-duchess-who-wasnt-day",
  name: "The Duchess Who Wasn't Day"
}, {
  id: "according-to-hoyle-day",
  name: "According to Hoyle Day"
}, {
  id: "no-interruptions-day",
  name: "No Interruptions Day"
}, {
  id: "pepper-pot-day",
  name: "Pepper Pot Day"
}, {
  id: "bicarbonate-of-soda-day",
  name: "Bicarbonate of Soda Day"
}, {
  id: "daylight-appreciation-day",
  name: "Daylight Appreciation Day"
}];
const sportsOptions = [{
  id: "american-football",
  name: "American Football"
}, {
  id: "basketball",
  name: "Basketball"
}, {
  id: "baseball",
  name: "Baseball"
}, {
  id: "ice-hockey",
  name: "Ice Hockey"
}, {
  id: "soccer",
  name: "Soccer"
}, {
  id: "boxing",
  name: "Boxing"
}, {
  id: "golf",
  name: "Golf"
}, {
  id: "mixed-martial-arts",
  name: "Mixed Martial Arts"
}, {
  id: "pro-wrestling",
  name: "Pro Wrestling"
}, {
  id: "tennis",
  name: "Tennis"
}, {
  id: "nascar",
  name: "NASCAR"
}, {
  id: "formula-one",
  name: "Formula One"
}, {
  id: "track-and-field",
  name: "Track and Field"
}, {
  id: "gymnastics",
  name: "Gymnastics"
}, {
  id: "swimming",
  name: "Swimming"
}, {
  id: "volleyball",
  name: "Volleyball"
}, {
  id: "figure-skating",
  name: "Figure Skating"
}, {
  id: "lacrosse",
  name: "Lacrosse"
}, {
  id: "pickleball",
  name: "Pickleball"
}, {
  id: "rugby",
  name: "Rugby"
}, {
  id: "cricket",
  name: "Cricket"
}, {
  id: "horse-racing",
  name: "Horse Racing"
}, {
  id: "table-tennis",
  name: "Table Tennis"
}, {
  id: "bowling",
  name: "Bowling"
}, {
  id: "billiards-pool",
  name: "Billiards/Pool"
}, {
  id: "darts",
  name: "Darts"
}, {
  id: "alpine-skiing",
  name: "Alpine Skiing"
}, {
  id: "snowboarding",
  name: "Snowboarding"
}, {
  id: "skateboarding",
  name: "Skateboarding"
}, {
  id: "surfing",
  name: "Surfing"
}, {
  id: "amateur-wrestling",
  name: "Amateur Wrestling"
}, {
  id: "motocross-supercross",
  name: "Motocross/Supercross"
}, {
  id: "indycar-racing",
  name: "IndyCar Racing"
}, {
  id: "poker",
  name: "Poker"
}, {
  id: "cheerleading",
  name: "Cheerleading"
}, {
  id: "drag-racing",
  name: "Drag Racing"
}, {
  id: "karate",
  name: "Karate"
}, {
  id: "judo",
  name: "Judo"
}, {
  id: "taekwondo",
  name: "Taekwondo"
}, {
  id: "brazilian-jiu-jitsu",
  name: "Brazilian Jiu-Jitsu"
}, {
  id: "kickboxing",
  name: "Kickboxing"
}, {
  id: "softball",
  name: "Softball"
}, {
  id: "ultimate",
  name: "Ultimate"
}, {
  id: "disc-golf",
  name: "Disc Golf"
}, {
  id: "cornhole",
  name: "Cornhole"
}, {
  id: "team-handball",
  name: "Team Handball"
}, {
  id: "field-hockey",
  name: "Field Hockey"
}, {
  id: "badminton",
  name: "Badminton"
}, {
  id: "squash",
  name: "Squash"
}, {
  id: "racquetball",
  name: "Racquetball"
}, {
  id: "curling",
  name: "Curling"
}, {
  id: "shooting",
  name: "Shooting"
}, {
  id: "archery",
  name: "Archery"
}, {
  id: "fishing",
  name: "Fishing"
}, {
  id: "speed-skating",
  name: "Speed Skating"
}, {
  id: "diving",
  name: "Diving"
}, {
  id: "water-polo",
  name: "Water Polo"
}, {
  id: "luge",
  name: "Luge"
}, {
  id: "bobsled",
  name: "Bobsled"
}, {
  id: "skeleton",
  name: "Skeleton"
}, {
  id: "biathlon",
  name: "Biathlon"
}, {
  id: "cross-country-skiing",
  name: "Cross-Country Skiing"
}, {
  id: "rock-climbing",
  name: "Rock Climbing"
}, {
  id: "powerlifting",
  name: "Powerlifting"
}, {
  id: "bodybuilding",
  name: "Bodybuilding"
}, {
  id: "strongman-competitions",
  name: "Strongman Competitions"
}, {
  id: "olympic-weightlifting",
  name: "Olympic Weightlifting"
}, {
  id: "crossfit",
  name: "CrossFit"
}, {
  id: "fencing",
  name: "Fencing"
}, {
  id: "jai-alai",
  name: "Jai Alai"
}, {
  id: "roller-derby",
  name: "Roller Derby"
}, {
  id: "bmx",
  name: "BMX"
}, {
  id: "mountain-biking",
  name: "Mountain Biking"
}, {
  id: "rodeo",
  name: "Rodeo"
}, {
  id: "equestrian",
  name: "Equestrian"
}, {
  id: "polo",
  name: "Polo"
}, {
  id: "sailing",
  name: "Sailing"
}, {
  id: "rowing",
  name: "Rowing"
}, {
  id: "canoe-kayak-racing",
  name: "Canoe/Kayak Racing"
}, {
  id: "triathlon",
  name: "Triathlon"
}, {
  id: "chess",
  name: "Chess"
}, {
  id: "esports",
  name: "Esports"
}, {
  id: "parkour-freerunning",
  name: "Parkour/Freerunning"
}, {
  id: "breakdancing",
  name: "Breakdancing"
}, {
  id: "windsurfing",
  name: "Windsurfing"
}, {
  id: "kitesurfing",
  name: "Kitesurfing"
}, {
  id: "skydiving",
  name: "Skydiving"
}, {
  id: "hang-gliding-paragliding",
  name: "Hang Gliding/Paragliding"
}, {
  id: "drone-racing",
  name: "Drone Racing"
}, {
  id: "rally-racing",
  name: "Rally Racing"
}, {
  id: "sumo-wrestling",
  name: "Sumo Wrestling"
}, {
  id: "arm-wrestling",
  name: "Arm Wrestling"
}, {
  id: "paintball",
  name: "Paintball"
}, {
  id: "professional-tag",
  name: "Professional Tag"
}, {
  id: "dodgeball",
  name: "Dodgeball"
}, {
  id: "kickball",
  name: "Kickball"
}, {
  id: "quidditch",
  name: "Quidditch"
}, {
  id: "sepak-takraw",
  name: "Sepak Takraw"
}, {
  id: "kabaddi",
  name: "Kabaddi"
}, {
  id: "australian-rules-football",
  name: "Australian Rules Football"
}, {
  id: "gaelic-football",
  name: "Gaelic Football"
}, {
  id: "hurling",
  name: "Hurling"
}, {
  id: "floorball",
  name: "Floorball"
}, {
  id: "tractor-pulling",
  name: "Tractor Pulling"
}, {
  id: "shuffleboard",
  name: "Shuffleboard"
}, {
  id: "ballroom-dancing",
  name: "Ballroom Dancing"
}, {
  id: "lumberjack-games",
  name: "Lumberjack Games"
}, {
  id: "flag-football",
  name: "Flag Football"
}, {
  id: "obstacle-course-racing",
  name: "Obstacle Course Racing"
}, {
  id: "freediving",
  name: "Freediving"
}, {
  id: "underwater-hockey",
  name: "Underwater Hockey"
}, {
  id: "underwater-rugby",
  name: "Underwater Rugby"
}, {
  id: "beach-volleyball",
  name: "Beach Volleyball"
}, {
  id: "water-skiing",
  name: "Water Skiing"
}, {
  id: "jet-ski-racing",
  name: "Jet Ski Racing"
}, {
  id: "wakeboarding",
  name: "Wakeboarding"
}, {
  id: "orienteering",
  name: "Orienteering"
}, {
  id: "marathon-running",
  name: "Marathon Running"
}, {
  id: "racewalking",
  name: "Racewalking"
}, {
  id: "highland-games",
  name: "Highland Games"
}, {
  id: "dragon-boat-racing",
  name: "Dragon Boat Racing"
}, {
  id: "bridge",
  name: "Bridge"
}, {
  id: "rhythmic-gymnastics",
  name: "Rhythmic Gymnastics"
}, {
  id: "trampoline-gymnastics",
  name: "Trampoline Gymnastics"
}, {
  id: "paralympic-sports",
  name: "Paralympic Sports"
}, {
  id: "netball",
  name: "Netball"
}, {
  id: "padel",
  name: "Padel"
}, {
  id: "american-handball",
  name: "American Handball"
}, {
  id: "teqball",
  name: "Teqball"
}, {
  id: "cross-country-running",
  name: "Cross-Country Running"
}, {
  id: "modern-pentathlon",
  name: "Modern Pentathlon"
}, {
  id: "short-track-speed-skating",
  name: "Short Track Speed Skating"
}, {
  id: "freestyle-skiing",
  name: "Freestyle Skiing"
}, {
  id: "ski-jumping",
  name: "Ski Jumping"
}, {
  id: "footgolf",
  name: "Footgolf"
}, {
  id: "powerboat-racing",
  name: "Powerboat Racing"
}, {
  id: "korfball",
  name: "Korfball"
}, {
  id: "capoeira",
  name: "Capoeira"
}, {
  id: "street-luge",
  name: "Street Luge"
}, {
  id: "cliff-diving",
  name: "Cliff Diving"
}, {
  id: "slacklining",
  name: "Slacklining"
}, {
  id: "spikeball",
  name: "Spikeball"
}, {
  id: "axe-throwing",
  name: "Axe Throwing"
}, {
  id: "chess-boxing",
  name: "Chess Boxing"
}, {
  id: "cycleball",
  name: "Cycleball"
}, {
  id: "wife-carrying",
  name: "Wife Carrying"
}, {
  id: "pillow-fighting",
  name: "Pillow Fighting"
}, {
  id: "slamball",
  name: "Slamball"
}, {
  id: "sandboarding",
  name: "Sandboarding"
}, {
  id: "sport-kite-flying",
  name: "Sport Kite Flying"
}, {
  id: "snowmobile-racing",
  name: "Snowmobile Racing"
}, {
  id: "drifting",
  name: "Drifting"
}, {
  id: "inline-speed-skating",
  name: "Inline Speed Skating"
}, {
  id: "logrolling",
  name: "Logrolling"
}, {
  id: "fistball",
  name: "Fistball"
}, {
  id: "equestrian-vaulting",
  name: "Equestrian Vaulting"
}, {
  id: "inline-hockey",
  name: "Inline Hockey"
}, {
  id: "lawn-bowls",
  name: "Lawn Bowls"
}, {
  id: "bocce",
  name: "Bocce"
}, {
  id: "croquet",
  name: "Croquet"
}, {
  id: "tug-of-war",
  name: "Tug-of-War"
}, {
  id: "wingsuit-flying",
  name: "Wingsuit Flying"
}, {
  id: "gliding",
  name: "Gliding"
}, {
  id: "cowboy-mounted-shooting",
  name: "Cowboy Mounted Shooting"
}, {
  id: "cutting",
  name: "Cutting"
}, {
  id: "futsal",
  name: "Futsal"
}, {
  id: "horseshoes",
  name: "Horseshoes"
}, {
  id: "kendo",
  name: "Kendo"
}, {
  id: "bandy",
  name: "Bandy"
}, {
  id: "rackets",
  name: "Rackets"
}, {
  id: "real-tennis",
  name: "Real Tennis"
}, {
  id: "synchronized-swimming",
  name: "Synchronized Swimming"
}, {
  id: "air-racing",
  name: "Air Racing"
}, {
  id: "greyhound-racing",
  name: "Greyhound Racing"
}, {
  id: "dogsled-racing",
  name: "Dogsled Racing"
}, {
  id: "harness-racing",
  name: "Harness Racing"
}, {
  id: "jousting",
  name: "Jousting"
}, {
  id: "motorcycle-speedway",
  name: "Motorcycle Speedway"
}, {
  id: "kart-racing",
  name: "Kart Racing"
}, {
  id: "midget-car-racing",
  name: "Midget Car Racing"
}, {
  id: "mountaineering",
  name: "Mountaineering"
}, {
  id: "counter-strike",
  name: "Counter-Strike"
}, {
  id: "dota-2",
  name: "Dota 2"
}, {
  id: "fortnite",
  name: "Fortnite"
}, {
  id: "stick-fighting",
  name: "Stick Fighting"
}, {
  id: "artistic-roller-skating",
  name: "Artistic Roller Skating"
}, {
  id: "tchoukball",
  name: "Tchoukball"
}, {
  id: "dog-agility",
  name: "Dog Agility"
}, {
  id: "baton-twirling",
  name: "Baton Twirling"
}, {
  id: "skijoring",
  name: "Skijoring"
}, {
  id: "snowshoe-racing",
  name: "Snowshoe Racing"
}, {
  id: "land-sailing",
  name: "Land Sailing"
}, {
  id: "beer-mile-racing",
  name: "Beer Mile Racing"
}, {
  id: "competitive-eating",
  name: "Competitive Eating"
}, {
  id: "monster-truck-competitions",
  name: "Monster Truck Competitions"
}, {
  id: "demolition-derby",
  name: "Demolition Derby"
}, {
  id: "lawnmower-racing",
  name: "Lawnmower Racing"
}, {
  id: "outhouse-racing",
  name: "Outhouse Racing"
}, {
  id: "giant-pumpkin-regatta",
  name: "Giant Pumpkin Regatta"
}, {
  id: "yoga",
  name: "Yoga"
}];
const dailyLifeOptions = [{
  id: "hockey-practice",
  name: "Hockey practice"
}, {
  id: "work-commute",
  name: "Work commute"
}, {
  id: "work-emails",
  name: "Work emails"
}, {
  id: "morning-alarm",
  name: "Morning alarm"
}, {
  id: "coffee",
  name: "Coffee"
}, {
  id: "school-drop-off",
  name: "School drop-off"
}, {
  id: "cooking-dinner",
  name: "Cooking dinner"
}, {
  id: "grocery-shopping",
  name: "Grocery shopping"
}, {
  id: "dishes",
  name: "Dishes"
}, {
  id: "laundry",
  name: "Laundry"
}, {
  id: "trash-day",
  name: "Trash day"
}, {
  id: "cleaning-bathroom",
  name: "Cleaning bathroom"
}, {
  id: "vacuuming",
  name: "Vacuuming"
}, {
  id: "bedtime-routine",
  name: "Bedtime routine"
}, {
  id: "homework-help",
  name: "Homework help"
}, {
  id: "packing-lunches",
  name: "Packing lunches"
}, {
  id: "soccer-practice",
  name: "Soccer practice"
}, {
  id: "basketball-practice",
  name: "Basketball practice"
}, {
  id: "baseball-practice",
  name: "Baseball practice"
}, {
  id: "gym-workout",
  name: "Gym workout"
}, {
  id: "walking-the-dog",
  name: "Walking the dog"
}, {
  id: "pet-feeding",
  name: "Pet feeding"
}, {
  id: "showering",
  name: "Showering"
}, {
  id: "brushing-teeth",
  name: "Brushing teeth"
}, {
  id: "social-media-scrolling",
  name: "Social media scrolling"
}, {
  id: "texting",
  name: "Texting"
}, {
  id: "group-chat",
  name: "Group chat"
}, {
  id: "streaming-tv",
  name: "Streaming TV"
}, {
  id: "driving-kids",
  name: "Driving kids"
}, {
  id: "parking-lot-hunt",
  name: "Parking lot hunt"
}, {
  id: "traffic-jam",
  name: "Traffic jam"
}, {
  id: "weather-check",
  name: "Weather check"
}, {
  id: "meal-prep",
  name: "Meal prep"
}, {
  id: "breakfast-scramble",
  name: "Breakfast scramble"
}, {
  id: "making-the-bed",
  name: "Making the bed"
}, {
  id: "coffee-spill",
  name: "Coffee spill"
}, {
  id: "lost-keys",
  name: "Lost keys"
}, {
  id: "running-late",
  name: "Running late"
}, {
  id: "farting",
  name: "Farting"
}, {
  id: "napping",
  name: "Napping"
}, {
  id: "snack-break",
  name: "Snack break"
}, {
  id: "water-bottle-refill",
  name: "Water bottle refill"
}, {
  id: "email-overload",
  name: "Email overload"
}, {
  id: "zoom-meeting",
  name: "Zoom meeting"
}, {
  id: "slack-pings",
  name: "Slack pings"
}, {
  id: "phone-low-battery",
  name: "Phone low battery"
}, {
  id: "charging-phone",
  name: "Charging phone"
}, {
  id: "wifi-issues",
  name: "Wi-Fi issues"
}, {
  id: "password-reset",
  name: "Password reset"
}, {
  id: "software-update",
  name: "Software update"
}, {
  id: "calendar-juggling",
  name: "Calendar juggling"
}, {
  id: "carpool",
  name: "Carpool"
}, {
  id: "pto-request",
  name: "PTO request"
}, {
  id: "payday",
  name: "Payday"
}, {
  id: "bills-due",
  name: "Bills due"
}, {
  id: "budgeting",
  name: "Budgeting"
}, {
  id: "rent-or-mortgage",
  name: "Rent or mortgage"
}, {
  id: "online-shopping",
  name: "Online shopping"
}, {
  id: "package-delivery",
  name: "Package delivery"
}, {
  id: "returns-line",
  name: "Returns line"
}, {
  id: "car-wash",
  name: "Car wash"
}, {
  id: "gas-station",
  name: "Gas station"
}, {
  id: "ev-charging",
  name: "EV charging"
}, {
  id: "oil-change",
  name: "Oil change"
}, {
  id: "check-engine-light",
  name: "Check engine light"
}, {
  id: "car-maintenance-booking",
  name: "Car maintenance booking"
}, {
  id: "doctor-appointment",
  name: "Doctor appointment"
}, {
  id: "dentist-appointment",
  name: "Dentist appointment"
}, {
  id: "pharmacy-pickup",
  name: "Pharmacy pickup"
}, {
  id: "vitamins",
  name: "Vitamins"
}, {
  id: "allergies",
  name: "Allergies"
}, {
  id: "headache",
  name: "Headache"
}, {
  id: "back-pain",
  name: "Back pain"
}, {
  id: "stretching",
  name: "Stretching"
}, {
  id: "yoga-class",
  name: "Yoga class"
}, {
  id: "meditation",
  name: "Meditation"
}, {
  id: "jogging",
  name: "Jogging"
}, {
  id: "bike-ride",
  name: "Bike ride"
}, {
  id: "walk-in-park",
  name: "Walk in park"
}, {
  id: "dog-park",
  name: "Dog park"
}, {
  id: "cat-litter-box",
  name: "Cat litter box"
}, {
  id: "pet-grooming",
  name: "Pet grooming"
}, {
  id: "vacuum-pet-hair",
  name: "Vacuum pet hair"
}, {
  id: "spill-cleanup",
  name: "Spill cleanup"
}, {
  id: "decluttering",
  name: "Decluttering"
}, {
  id: "laundry-folding",
  name: "Laundry folding"
}, {
  id: "ironing",
  name: "Ironing"
}, {
  id: "mowing-lawn",
  name: "Mowing lawn"
}, {
  id: "snow-shoveling",
  name: "Snow shoveling"
}, {
  id: "leaf-raking",
  name: "Leaf raking"
}, {
  id: "garden-watering",
  name: "Garden watering"
}, {
  id: "houseplant-care",
  name: "Houseplant care"
}, {
  id: "home-repair",
  name: "Home repair"
}, {
  id: "lightbulb-change",
  name: "Lightbulb change"
}, {
  id: "smoke-detector-beep",
  name: "Smoke detector beep"
}, {
  id: "diy-project",
  name: "DIY project"
}, {
  id: "painting-room",
  name: "Painting room"
}, {
  id: "hanging-shelves",
  name: "Hanging shelves"
}, {
  id: "moving-furniture",
  name: "Moving furniture"
}, {
  id: "home-office-setup",
  name: "Home office setup"
}, {
  id: "screen-time-guilt",
  name: "Screen time guilt"
}, {
  id: "doomscrolling",
  name: "Doomscrolling"
}, {
  id: "news-headlines",
  name: "News headlines"
}, {
  id: "weather-alert",
  name: "Weather alert"
}, {
  id: "coffee-run",
  name: "Coffee run"
}, {
  id: "drive-thru",
  name: "Drive-thru"
}, {
  id: "fast-food-night",
  name: "Fast food night"
}, {
  id: "pizza-night",
  name: "Pizza night"
}, {
  id: "taco-tuesday",
  name: "Taco Tuesday"
}, {
  id: "leftovers",
  name: "Leftovers"
}, {
  id: "meal-kit",
  name: "Meal kit"
}, {
  id: "baking-cookies",
  name: "Baking cookies"
}, {
  id: "bread-baking",
  name: "Bread baking"
}, {
  id: "grilling",
  name: "Grilling"
}, {
  id: "potluck-prep",
  name: "Potluck prep"
}, {
  id: "lunch-break",
  name: "Lunch break"
}, {
  id: "water-cooler-chat",
  name: "Water cooler chat"
}, {
  id: "office-small-talk",
  name: "Office small talk"
}, {
  id: "meeting-that-should-be-email",
  name: "Meeting that should be email"
}, {
  id: "end-of-day-commute",
  name: "End of day commute"
}, {
  id: "school-pickup",
  name: "School pickup"
}, {
  id: "after-school-snack",
  name: "After-school snack"
}, {
  id: "playdate",
  name: "Playdate"
}, {
  id: "bedtime-story",
  name: "Bedtime story"
}, {
  id: "bath-time",
  name: "Bath time"
}, {
  id: "diaper-change",
  name: "Diaper change"
}, {
  id: "potty-training",
  name: "Potty training"
}, {
  id: "tantrum",
  name: "Tantrum"
}, {
  id: "time-out",
  name: "Time-out"
}, {
  id: "chores-chart",
  name: "Chores chart"
}, {
  id: "pta-meeting",
  name: "PTA meeting"
}, {
  id: "parent-teacher-conference",
  name: "Parent-teacher conference"
}, {
  id: "school-project",
  name: "School project"
}, {
  id: "science-fair",
  name: "Science fair"
}, {
  id: "book-fair",
  name: "Book fair"
}, {
  id: "field-trip-form",
  name: "Field trip form"
}, {
  id: "school-spirit-day",
  name: "School spirit day"
}, {
  id: "lost-and-found",
  name: "Lost and found"
}, {
  id: "car-seat-buckle",
  name: "Car seat buckle"
}, {
  id: "booster-seat-swap",
  name: "Booster seat swap"
}, {
  id: "weekend-tournament",
  name: "Weekend tournament"
}, {
  id: "early-morning-rink",
  name: "Early morning rink"
}, {
  id: "skate-sharpening",
  name: "Skate sharpening"
}, {
  id: "equipment-bag-chaos",
  name: "Equipment bag chaos"
}, {
  id: "jersey-laundry",
  name: "Jersey laundry"
}, {
  id: "snack-duty",
  name: "Snack duty"
}, {
  id: "team-photo-day",
  name: "Team photo day"
}, {
  id: "fundraiser",
  name: "Fundraiser"
}, {
  id: "carpool-schedule-swap",
  name: "Carpool schedule swap"
}, {
  id: "rainout",
  name: "Rainout"
}, {
  id: "snow-day",
  name: "Snow day"
}, {
  id: "sick-day",
  name: "Sick day"
}, {
  id: "work-from-home",
  name: "Work from home"
}, {
  id: "home-wifi-battle",
  name: "Home Wi-Fi battle"
}, {
  id: "background-noise-kids",
  name: "Background noise kids"
}, {
  id: "muted-mic-mishap",
  name: "Muted mic mishap"
}, {
  id: "camera-off-mode",
  name: "Camera off mode"
}, {
  id: "virtual-happy-hour",
  name: "Virtual happy hour"
}, {
  id: "lunch-packing-fail",
  name: "Lunch packing fail"
}, {
  id: "microwave-queue",
  name: "Microwave queue"
}, {
  id: "office-birthday-cake",
  name: "Office birthday cake"
}, {
  id: "potluck-cleanup",
  name: "Potluck cleanup"
}, {
  id: "office-fridge-drama",
  name: "Office fridge drama"
}, {
  id: "printer-jam",
  name: "Printer jam"
}, {
  id: "lost-stapler",
  name: "Lost stapler"
}, {
  id: "supply-closet-run",
  name: "Supply closet run"
}, {
  id: "expense-report",
  name: "Expense report"
}, {
  id: "timesheet",
  name: "Timesheet"
}, {
  id: "performance-review",
  name: "Performance review"
}, {
  id: "deadline-crunch",
  name: "Deadline crunch"
}, {
  id: "overtime",
  name: "Overtime"
}, {
  id: "side-hustle",
  name: "Side hustle"
}, {
  id: "freelance-gig",
  name: "Freelance gig"
}, {
  id: "job-interview",
  name: "Job interview"
}, {
  id: "resume-update",
  name: "Resume update"
}, {
  id: "linkedin-scroll",
  name: "LinkedIn scroll"
}, {
  id: "networking-event",
  name: "Networking event"
}, {
  id: "business-travel",
  name: "Business travel"
}, {
  id: "airport-security",
  name: "Airport security"
}, {
  id: "boarding-scramble",
  name: "Boarding scramble"
}, {
  id: "carry-on-tetris",
  name: "Carry-on Tetris"
}, {
  id: "delayed-flight",
  name: "Delayed flight"
}, {
  id: "lost-luggage",
  name: "Lost luggage"
}, {
  id: "hotel-check-in",
  name: "Hotel check-in"
}, {
  id: "room-key-fail",
  name: "Room key fail"
}, {
  id: "conference-badge",
  name: "Conference badge"
}, {
  id: "convention-swag",
  name: "Convention swag"
}, {
  id: "ride-share",
  name: "Ride share"
}, {
  id: "taxi-line",
  name: "Taxi line"
}, {
  id: "subway-delay",
  name: "Subway delay"
}, {
  id: "bus-transfer",
  name: "Bus transfer"
}, {
  id: "bike-share",
  name: "Bike share"
}, {
  id: "parking-ticket",
  name: "Parking ticket"
}, {
  id: "meter-running",
  name: "Meter running"
}, {
  id: "car-rental-desk",
  name: "Car rental desk"
}, {
  id: "road-trip",
  name: "Road trip"
}, {
  id: "rest-stop",
  name: "Rest stop"
}, {
  id: "toll-booth",
  name: "Toll booth"
}, {
  id: "gps-reroute",
  name: "GPS reroute"
}, {
  id: "wrong-turn",
  name: "Wrong turn"
}, {
  id: "scenic-detour",
  name: "Scenic detour"
}, {
  id: "photo-stop",
  name: "Photo stop"
}, {
  id: "gas-price-shock",
  name: "Gas price shock"
}, {
  id: "ev-charger-queue",
  name: "EV charger queue"
}, {
  id: "playlist-wars",
  name: "Playlist wars"
}, {
  id: "car-karaoke",
  name: "Car karaoke"
}, {
  id: "backseat-arguments",
  name: "Backseat arguments"
}, {
  id: "are-we-there-yet",
  name: "Are we there yet"
}, {
  id: "vacation-planning",
  name: "Vacation planning"
}, {
  id: "travel-insurance",
  name: "Travel insurance"
}, {
  id: "airbnb-search",
  name: "Airbnb search"
}, {
  id: "check-out-cleaning",
  name: "Check-out cleaning"
}, {
  id: "souvenir-shopping",
  name: "Souvenir shopping"
}, {
  id: "theme-park-line",
  name: "Theme park line"
}, {
  id: "beach-day",
  name: "Beach day"
}, {
  id: "hiking-trail",
  name: "Hiking trail"
}, {
  id: "camping-setup",
  name: "Camping setup"
}, {
  id: "campfire-smores",
  name: "Campfire s'mores"
}, {
  id: "mosquito-bites",
  name: "Mosquito bites"
}, {
  id: "sunscreen-fail",
  name: "Sunscreen fail"
}, {
  id: "sunburn",
  name: "Sunburn"
}, {
  id: "rainy-day-backup",
  name: "Rainy day backup"
}, {
  id: "snowstorm-prep",
  name: "Snowstorm prep"
}, {
  id: "power-outage",
  name: "Power outage"
}, {
  id: "generator-test",
  name: "Generator test"
}, {
  id: "space-heater",
  name: "Space heater"
}, {
  id: "thermostat-battle",
  name: "Thermostat battle"
}, {
  id: "ac-not-cooling",
  name: "AC not cooling"
}, {
  id: "filter-change",
  name: "Filter change"
}, {
  id: "window-draft",
  name: "Window draft"
}, {
  id: "roof-leak",
  name: "Roof leak"
}, {
  id: "plumber-visit",
  name: "Plumber visit"
}, {
  id: "electrician-visit",
  name: "Electrician visit"
}, {
  id: "handyman-call",
  name: "Handyman call"
}, {
  id: "hoa-notice",
  name: "HOA notice"
}, {
  id: "neighbor-noise",
  name: "Neighbor noise"
}, {
  id: "package-porch-pirate",
  name: "Package porch pirate"
}, {
  id: "doorbell-camera-alert",
  name: "Doorbell camera alert"
}, {
  id: "delivery-window-wait",
  name: "Delivery window wait"
}, {
  id: "missed-delivery-slip",
  name: "Missed delivery slip"
}, {
  id: "bank-app-login",
  name: "Bank app login"
}, {
  id: "overdraft-alert",
  name: "Overdraft alert"
}, {
  id: "credit-card-decline",
  name: "Credit card decline"
}, {
  id: "cashback-rewards",
  name: "Cashback rewards"
}, {
  id: "coupon-code-hunt",
  name: "Coupon code hunt"
}, {
  id: "subscription-creep",
  name: "Subscription creep"
}, {
  id: "free-trial-cancel",
  name: "Free trial cancel"
}, {
  id: "tax-prep",
  name: "Tax prep"
}, {
  id: "refund-wait",
  name: "Refund wait"
}, {
  id: "investment-check",
  name: "Investment check"
}, {
  id: "crypto-dip",
  name: "Crypto dip"
}, {
  id: "fantasy-sports-draft",
  name: "Fantasy sports draft"
}, {
  id: "bracket-bust",
  name: "Bracket bust"
}, {
  id: "ticket-queue",
  name: "Ticket queue"
}, {
  id: "sold-out-rage",
  name: "Sold-out rage"
}, {
  id: "scalper-prices",
  name: "Scalper prices"
}, {
  id: "concert-night",
  name: "Concert night"
}, {
  id: "pre-game-tailgate",
  name: "Pre-game tailgate"
}, {
  id: "watch-party",
  name: "Watch party"
}, {
  id: "spoiler-alert",
  name: "Spoiler alert"
}, {
  id: "new-episode-drop",
  name: "New episode drop"
}, {
  id: "binge-watch",
  name: "Binge watch"
}, {
  id: "series-finale",
  name: "Series finale"
}, {
  id: "rewatch-comfort-show",
  name: "Rewatch comfort show"
}, {
  id: "movie-night",
  name: "Movie night"
}, {
  id: "popcorn-burn",
  name: "Popcorn burn"
}, {
  id: "board-game-night",
  name: "Board game night"
}, {
  id: "puzzle-time",
  name: "Puzzle time"
}, {
  id: "lego-build",
  name: "Lego build"
}, {
  id: "craft-corner",
  name: "Craft corner"
}, {
  id: "knitting-project",
  name: "Knitting project"
}, {
  id: "sewing-fix",
  name: "Sewing fix"
}, {
  id: "crochet-blanket",
  name: "Crochet blanket"
}, {
  id: "scrapbooking",
  name: "Scrapbooking"
}, {
  id: "painting-miniatures",
  name: "Painting miniatures"
}, {
  id: "model-building",
  name: "Model building"
}, {
  id: "woodworking",
  name: "Woodworking"
}, {
  id: "3d-printing",
  name: "3D printing"
}, {
  id: "photography-walk",
  name: "Photography walk"
}, {
  id: "video-editing",
  name: "Video editing"
}, {
  id: "streaming-setup",
  name: "Streaming setup"
}, {
  id: "hdmi-not-found",
  name: "HDMI not found"
}, {
  id: "bluetooth-pairing",
  name: "Bluetooth pairing"
}, {
  id: "smart-speaker-command",
  name: "Smart speaker command"
}, {
  id: "smart-bulb-reset",
  name: "Smart bulb reset"
}, {
  id: "app-update",
  name: "App update"
}, {
  id: "two-factor-code",
  name: "Two-factor code"
}, {
  id: "password-manager",
  name: "Password manager"
}, {
  id: "cloud-storage-full",
  name: "Cloud storage full"
}, {
  id: "phone-cracked-screen",
  name: "Phone cracked screen"
}, {
  id: "screen-protector-bubbles",
  name: "Screen protector bubbles"
}, {
  id: "case-upgrade",
  name: "Case upgrade"
}, {
  id: "laptop-overheating",
  name: "Laptop overheating"
}, {
  id: "keyboard-crumbs",
  name: "Keyboard crumbs"
}, {
  id: "mouse-battery-dead",
  name: "Mouse battery dead"
}, {
  id: "printer-out-of-ink",
  name: "Printer out of ink"
}, {
  id: "scanner-failure",
  name: "Scanner failure"
}, {
  id: "cable-management",
  name: "Cable management"
}, {
  id: "desk-ergonomics",
  name: "Desk ergonomics"
}, {
  id: "standing-desk",
  name: "Standing desk"
}, {
  id: "dating-app-swipe",
  name: "Dating app swipe"
}, {
  id: "first-date-jitters",
  name: "First date jitters"
}, {
  id: "ghosting",
  name: "Ghosting"
}, {
  id: "group-chat-mute",
  name: "Group chat mute"
}, {
  id: "family-group-chaos",
  name: "Family group chaos"
}, {
  id: "in-law-visit",
  name: "In-law visit"
}, {
  id: "babysitter-booking",
  name: "Babysitter booking"
}, {
  id: "anniversary-dinner",
  name: "Anniversary dinner"
}, {
  id: "birthday-party-prep",
  name: "Birthday party prep"
}, {
  id: "gift-wrapping",
  name: "Gift wrapping"
}, {
  id: "thank-you-note",
  name: "Thank-you note"
}, {
  id: "greeting-cards",
  name: "Greeting cards"
}, {
  id: "neighbor-barbecue",
  name: "Neighbor barbecue"
}, {
  id: "potluck-dish",
  name: "Potluck dish"
}, {
  id: "housewarming-gift",
  name: "Housewarming gift"
}, {
  id: "yard-sale",
  name: "Yard sale"
}, {
  id: "thrift-store-haul",
  name: "Thrift store haul"
}, {
  id: "donation-drop-off",
  name: "Donation drop-off"
}, {
  id: "closet-purge",
  name: "Closet purge"
}, {
  id: "capsule-wardrobe",
  name: "Capsule wardrobe"
}, {
  id: "outfit-repeat",
  name: "Outfit repeat"
}, {
  id: "laundry-shrink",
  name: "Laundry shrink"
}, {
  id: "stain-remover-hack",
  name: "Stain remover hack"
}, {
  id: "dry-clean-pickup",
  name: "Dry-clean pickup"
}, {
  id: "shoe-scuff-fix",
  name: "Shoe scuff fix"
}, {
  id: "lost-sock",
  name: "Lost sock"
}, {
  id: "sock-day-mismatch",
  name: "Sock day mismatch"
}, {
  id: "haircut",
  name: "Haircut"
}, {
  id: "beard-trim",
  name: "Beard trim"
}, {
  id: "salon-appointment",
  name: "Salon appointment"
}, {
  id: "manicure",
  name: "Manicure"
}, {
  id: "skincare-routine",
  name: "Skincare routine"
}, {
  id: "sunscreen-daily",
  name: "Sunscreen daily"
}, {
  id: "deodorant-check",
  name: "Deodorant check"
}, {
  id: "shaving-nick",
  name: "Shaving nick"
}, {
  id: "perfume-spritz",
  name: "Perfume spritz"
}, {
  id: "new-glasses",
  name: "New glasses"
}, {
  id: "contact-lens-lost",
  name: "Contact lens lost"
}, {
  id: "eye-strain",
  name: "Eye strain"
}, {
  id: "blue-light-fatigue",
  name: "Blue light fatigue"
}, {
  id: "sleep-tracking",
  name: "Sleep tracking"
}, {
  id: "insomnia",
  name: "Insomnia"
}, {
  id: "snoring",
  name: "Snoring"
}, {
  id: "farting-in-bed",
  name: "Farting in bed"
}, {
  id: "morning-breath",
  name: "Morning breath"
}, {
  id: "flossing",
  name: "Flossing"
}, {
  id: "dentist-floss-shame",
  name: "Dentist floss shame"
}, {
  id: "water-floss-pick",
  name: "Water floss pick"
}, {
  id: "mouthwash-burn",
  name: "Mouthwash burn"
}, {
  id: "cavity-fill",
  name: "Cavity fill"
}, {
  id: "flu-shot",
  name: "Flu shot"
}, {
  id: "covid-test",
  name: "COVID test"
}, {
  id: "allergy-shot",
  name: "Allergy shot"
}, {
  id: "thermometer-check",
  name: "Thermometer check"
}, {
  id: "blood-pressure-cuff",
  name: "Blood pressure cuff"
}, {
  id: "step-counter-goal",
  name: "Step counter goal"
}, {
  id: "calorie-tracking",
  name: "Calorie tracking"
}, {
  id: "protein-shake",
  name: "Protein shake"
}, {
  id: "cheat-day",
  name: "Cheat day"
}, {
  id: "hangover-cure",
  name: "Hangover cure"
}, {
  id: "mocktail-night",
  name: "Mocktail night"
}, {
  id: "tea-time",
  name: "Tea time"
}, {
  id: "home-brewing",
  name: "Home brewing"
}, {
  id: "wine-tasting",
  name: "Wine tasting"
}, {
  id: "cocktail-class",
  name: "Cocktail class"
}, {
  id: "bartending-flair",
  name: "Bartending flair"
}, {
  id: "fantasy-league-trash-talk",
  name: "Fantasy league trash talk"
}, {
  id: "yardwork-injury",
  name: "Yardwork injury"
}, {
  id: "splinter-removal",
  name: "Splinter removal"
}, {
  id: "first-aid-kit",
  name: "First aid kit"
}, {
  id: "band-aid-hunt",
  name: "Band-Aid hunt"
}, {
  id: "paper-cut",
  name: "Paper cut"
}, {
  id: "door-stubbed-toe",
  name: "Door stubbed toe"
}, {
  id: "broken-nail",
  name: "Broken nail"
}, {
  id: "static-cling",
  name: "Static cling"
}, {
  id: "lint-roller",
  name: "Lint roller"
}, {
  id: "pet-vet-bill",
  name: "Pet vet bill"
}, {
  id: "pet-medication",
  name: "Pet medication"
}, {
  id: "chewed-shoe",
  name: "Chewed shoe"
}, {
  id: "lost-remote",
  name: "Lost remote"
}, {
  id: "couch-cushions-dive",
  name: "Couch cushions dive"
}, {
  id: "diy-fail",
  name: "DIY fail"
}, {
  id: "return-to-ikea",
  name: "Return to IKEA"
}, {
  id: "allen-key-search",
  name: "Allen key search"
}, {
  id: "instruction-manual-rage",
  name: "Instruction manual rage"
}, {
  id: "warranty-claim",
  name: "Warranty claim"
}, {
  id: "recall-notice",
  name: "Recall notice"
}, {
  id: "spam-call",
  name: "Spam call"
}, {
  id: "phishing-email",
  name: "Phishing email"
}, {
  id: "browser-pop-ups",
  name: "Browser pop-ups"
}, {
  id: "cookie-consent-fatigue",
  name: "Cookie consent fatigue"
}, {
  id: "app-permissions",
  name: "App permissions"
}, {
  id: "terms-and-conditions",
  name: "Terms and conditions"
}, {
  id: "survey-request",
  name: "Survey request"
}, {
  id: "calendar-double-booked",
  name: "Calendar double-booked"
}, {
  id: "time-zone-confusion",
  name: "Time zone confusion"
}, {
  id: "daylight-saving-change",
  name: "Daylight saving change"
}, {
  id: "lost-and-found-desk",
  name: "Lost and found desk"
}, {
  id: "elevator-small-talk",
  name: "Elevator small talk"
}, {
  id: "fire-drill",
  name: "Fire drill"
}];

const vibesPunchlinesOptions = [{
  id: "dad-jokes",
  name: "Dad Jokes",
  subtitle: "Cheesy predictable puns"
}, {
  id: "daily-vibes", 
  name: "Daily Vibes",
  subtitle: "Day-of-week jokes"
}, {
  id: "quotes",
  name: "Quotes",
  subtitle: "General, tone later"
}, {
  id: "one-liners",
  name: "One-Liners",
  subtitle: "Quick single jokes"
}, {
  id: "comebacks",
  name: "Comebacks",
  subtitle: "Witty fast retorts"
}, {
  id: "knock-knock-jokes",
  name: "Knock-Knock Jokes",
  subtitle: "Classic \"Who's there\""
}, {
  id: "puns-wordplay",
  name: "Puns & Wordplay",
  subtitle: "Clever double meanings"
}, {
  id: "self-deprecating",
  name: "Self-Deprecating",
  subtitle: "Jokes on yourself"
}, {
  id: "roasts",
  name: "Roasts",
  subtitle: "Playful sharp burns"
}, {
  id: "dark-humor",
  name: "Dark Humor",
  subtitle: "Morbid edgy jokes"
}, {
  id: "endings",
  name: "Endings",
  subtitle: "Funny closing lines"
}, {
  id: "life-tips",
  name: "Life Tips",
  subtitle: "Helpful witty advice"
}, {
  id: "affirmations",
  name: "Affirmations",
  subtitle: "Positive self-reminders"
}, {
  id: "relationship-humor",
  name: "Relationship Humor",
  subtitle: "Dating, couple jokes"
}, {
  id: "family-jokes",
  name: "Family Jokes",
  subtitle: "Friends or relatives"
}, {
  id: "office-humor",
  name: "Office Humor",
  subtitle: "Workplace banter struggles"
}, {
  id: "school-life",
  name: "School Life",
  subtitle: "Classroom study humor"
}, {
  id: "food-jokes",
  name: "Food Jokes",
  subtitle: "Eating, cravings"
}, {
  id: "coffee-humor",
  name: "Coffee Humor",
  subtitle: "Morning caffeine jokes"
}, {
  id: "pet-humor",
  name: "Pet Humor",
  subtitle: "Cats, dogs, animals"
}, {
  id: "tech-humor",
  name: "Tech Humor",
  subtitle: "Gadgets, glitches, online"
}, {
  id: "pop-culture",
  name: "Pop Culture",
  subtitle: "Celebs, TV, music"
}, {
  id: "classic-quotes",
  name: "Classic Quotes",
  subtitle: "Famous old lines"
}, {
  id: "monday-blues",
  name: "Monday Blues",
  subtitle: "Dreading week start"
}, {
  id: "friday-feeling",
  name: "Friday Feeling",
  subtitle: "Weekend hype laughs"
}, {
  id: "sunday-vibes",
  name: "Sunday Vibes",
  subtitle: "Chill or dread"
}, {
  id: "absurd-humor",
  name: "Absurd Humor",
  subtitle: "Nonsense surreal jokes"
}, {
  id: "parodies",
  name: "Parodies",
  subtitle: "Imitations with twist"
}, {
  id: "satire-irony",
  name: "Satire & Irony",
  subtitle: "Social commentary humor"
}, {
  id: "holiday-humor",
  name: "Holiday Humor",
  subtitle: "Seasonal festive laughs"
}, {
  id: "parenting-humor",
  name: "Parenting Humor",
  subtitle: "Raising kids chaos"
}, {
  id: "travel-humor",
  name: "Travel Humor",
  subtitle: "Vacation trip fails"
}, {
  id: "sports-fitness",
  name: "Sports & Fitness",
  subtitle: "Exercise, fan banter"
}, {
  id: "nostalgia-humor",
  name: "Nostalgia Humor",
  subtitle: "Childhood retro laughs"
}, {
  id: "internet-humor",
  name: "Internet Humor",
  subtitle: "Social trend jokes"
}, {
  id: "insults",
  name: "Insults",
  subtitle: "Burns, jabs, putdowns"
}, {
  id: "tongue-twisters",
  name: "Tongue Twisters",
  subtitle: "Word challenges"
}, {
  id: "riddles",
  name: "Riddles",
  subtitle: "Puzzle-style jokes"
}, {
  id: "proverb-twists",
  name: "Proverb Twists",
  subtitle: "Old sayings flipped"
}, {
  id: "shower-thoughts",
  name: "Shower Thoughts",
  subtitle: "Odd clever ideas"
}, {
  id: "complaints",
  name: "Complaints",
  subtitle: "Overblown small problems"
}, {
  id: "generational-humor",
  name: "Generational Humor",
  subtitle: "Gen Z vs Millennials"
}, {
  id: "adulting-humor",
  name: "Adulting Humor",
  subtitle: "Grown-up struggles"
}, {
  id: "introvert-extrovert",
  name: "Introvert Extrovert",
  subtitle: "Social energy jokes"
}, {
  id: "self-care-humor",
  name: "Self-Care Humor",
  subtitle: "Lazy indulgent laughs"
}, {
  id: "grammar-humor",
  name: "Grammar Humor",
  subtitle: "Language punctuation fun"
}, {
  id: "pirate-jokes",
  name: "Pirate Jokes",
  subtitle: "Nautical \"Arrr\" puns"
}, {
  id: "fantasy-zombie",
  name: "Fantasy & Zombie",
  subtitle: "Geeky monster humor"
}, {
  id: "science-humor",
  name: "Science Humor",
  subtitle: "STEM nerdy jokes"
}, {
  id: "weather-humor",
  name: "Weather Humor",
  subtitle: "Forecast seasonal laughs"
}, {
  id: "karen-memes",
  name: "Karen Memes",
  subtitle: "Entitled stereotypes"
}, {
  id: "celebrity-satire",
  name: "Celebrity Satire",
  subtitle: "Mocking famous quirks"
}, {
  id: "fails",
  name: "Fails",
  subtitle: "Funny mishaps mistakes"
}, {
  id: "philosophy-twists",
  name: "Philosophy Twists",
  subtitle: "Deep silly flips"
}, {
  id: "fun-facts",
  name: "Fun Facts",
  subtitle: "Trivia with punchline"
}, {
  id: "emoji-humor",
  name: "Emoji Humor",
  subtitle: "Playing with symbols"
}, {
  id: "quote-mashups",
  name: "Quote Mashups",
  subtitle: "Mixed sayings"
}, {
  id: "innuendo-humor",
  name: "Innuendo Humor",
  subtitle: "Suggestive double meanings"
}, {
  id: "work-from-home",
  name: "Work From Home",
  subtitle: "Remote job fun"
}, {
  id: "health-wellness",
  name: "Health & Wellness",
  subtitle: "Fitness diet laughs"
}, {
  id: "late-night-thoughts",
  name: "Late Night Thoughts",
  subtitle: "Overtired musings"
}, {
  id: "annoying-questions",
  name: "Annoying Questions",
  subtitle: "Nosy silly prods"
}, {
  id: "slang-lingo",
  name: "Slang & Lingo",
  subtitle: "Wordplay jokes"
}, {
  id: "mystery-puns",
  name: "Mystery Puns",
  subtitle: "Detective-style punchlines"
}, {
  id: "lightbulb-jokes",
  name: "Lightbulb Jokes",
  subtitle: "\"How many X\""
}, {
  id: "chuck-norris-jokes",
  name: "Chuck Norris Jokes",
  subtitle: "Absurd superhuman facts"
}, {
  id: "math-humor",
  name: "Math Humor",
  subtitle: "Number equation puns"
}, {
  id: "coding-jokes",
  name: "Coding Jokes",
  subtitle: "Programmer IT humor"
}, {
  id: "pet-peeves",
  name: "Pet Peeves",
  subtitle: "Shared annoyances"
}, {
  id: "apologies",
  name: "Apologies",
  subtitle: "Sorry not sorry"
}, {
  id: "awkward-comedy",
  name: "Awkward Comedy",
  subtitle: "Cringe relatable laughs"
}, {
  id: "trick-questions",
  name: "Trick Questions",
  subtitle: "Gotcha Q&A jokes"
}, {
  id: "self-help-parody",
  name: "Self-Help Parody",
  subtitle: "Motivational spoofs"
}, {
  id: "edgy-one-liners",
  name: "Edgy One-Liners",
  subtitle: "Risky quick jokes"
}, {
  id: "burnout-humor",
  name: "Burnout Humor",
  subtitle: "Exhaustion jokes"
}, {
  id: "ai-robot-jokes",
  name: "AI Robot Jokes",
  subtitle: "Future tech laughs"
}, {
  id: "gamer-memes",
  name: "Gamer Memes",
  subtitle: "Gaming culture fun"
}, {
  id: "would-you-rather",
  name: "Would You Rather",
  subtitle: "Absurd choices"
}, {
  id: "cat-memes",
  name: "Cat Memes",
  subtitle: "Feline antics"
}, {
  id: "dog-memes",
  name: "Dog Memes",
  subtitle: "Canine silliness"
}, {
  id: "dating-humor",
  name: "Dating Humor",
  subtitle: "Single romance laughs"
}, {
  id: "money-jokes",
  name: "Money Jokes",
  subtitle: "Broke rich jokes"
}, {
  id: "toilet-humor",
  name: "Toilet Humor",
  subtitle: "Bathroom laughs"
}, {
  id: "astrology-memes",
  name: "Astrology Memes",
  subtitle: "Zodiac stereotypes"
}, {
  id: "doctor-humor",
  name: "Doctor Humor",
  subtitle: "Medical profession laughs"
}, {
  id: "stoner-humor",
  name: "Stoner Humor",
  subtitle: "Cannabis culture fun"
}, {
  id: "bar-jokes",
  name: "Bar Jokes",
  subtitle: "Walks into..."
}, {
  id: "yo-mama-jokes",
  name: "Yo Mama Jokes",
  subtitle: "Insult classics"
}, {
  id: "clever-comebacks",
  name: "Clever Comebacks",
  subtitle: "Smart quick retorts"
}, {
  id: "anti-jokes",
  name: "Anti-Jokes",
  subtitle: "No punchline jokes"
}, {
  id: "pick-up-lines",
  name: "Pick-Up Lines",
  subtitle: "Flirty cheesy openers"
}, {
  id: "celebrations",
  name: "Celebrations",
  subtitle: "Joyful milestones"
}, {
  id: "funny-rants",
  name: "Funny Rants",
  subtitle: "Angry but funny"
}, {
  id: "lawyer-jokes",
  name: "Lawyer Jokes",
  subtitle: "Legal profession laughs"
}, {
  id: "little-johnny",
  name: "Little Johnny",
  subtitle: "Kid cheeky lines"
}, {
  id: "pranks",
  name: "Pranks",
  subtitle: "Trick setups"
}, {
  id: "heartbreak",
  name: "Heartbreak",
  subtitle: "Breakup lost love"
}, {
  id: "party-humor",
  name: "Party Humor",
  subtitle: "Night out fun"
}, {
  id: "seasonal-events",
  name: "Seasonal Events",
  subtitle: "Big yearly happenings"
}];

const popCultureOptions = [{
  id: "celebrities",
  name: "Celebrities",
  subtitle: "Gossip, drama, fame"
}, {
  id: "movies",
  name: "Movies",
  subtitle: "Blockbusters, hits, franchises"
}, {
  id: "tv-shows",
  name: "TV Shows",
  subtitle: "Streaming, binge, dramas"
}, {
  id: "music",
  name: "Music",
  subtitle: "Songs, albums, concerts"
}, {
  id: "memes",
  name: "Memes",
  subtitle: "Viral jokes, trends"
}, {
  id: "social-media",
  name: "Social Media",
  subtitle: "Influencers, posts, trends"
}, {
  id: "fashion",
  name: "Fashion",
  subtitle: "Style, looks, red carpet"
}, {
  id: "sports-pop",
  name: "Sports",
  subtitle: "Games, stars, events"
}, {
  id: "gaming",
  name: "Gaming",
  subtitle: "Consoles, PC, esports"
}, {
  id: "superheroes",
  name: "Superheroes",
  subtitle: "Marvel, DC, franchises"
}, {
  id: "reality-tv",
  name: "Reality TV",
  subtitle: "Drama, dating, competitions"
}, {
  id: "anime",
  name: "Anime",
  subtitle: "Shows, manga, cosplay"
}, {
  id: "award-shows",
  name: "Award Shows",
  subtitle: "Oscars, Grammys, Met Gala"
}, {
  id: "nostalgia",
  name: "Nostalgia",
  subtitle: "Throwbacks, reboots, classics"
}, {
  id: "food-trends",
  name: "Food Trends",
  subtitle: "Viral snacks, drinks"
}, {
  id: "tech-pop",
  name: "Tech",
  subtitle: "Gadgets, apps, AI"
}, {
  id: "books",
  name: "Books",
  subtitle: "Novels, memoirs, bestsellers"
}, {
  id: "royals",
  name: "Royals",
  subtitle: "Gossip, weddings, scandals"
}, {
  id: "festivals",
  name: "Festivals",
  subtitle: "Concerts, cons, gatherings"
}, {
  id: "comedy",
  name: "Comedy",
  subtitle: "Stand-up, skits, talk shows"
}];

const textStyleOptions = [{
  id: "humorous",
  name: "Humorous",
  description: "Jokes, puns, lighthearted entertainment"
}, {
  id: "savage",
  name: "Savage",
  description: "Sarcastic, bold, unapologetic wit"
}, {
  id: "sentimental",
  name: "Sentimental",
  description: "Warm, heartfelt, sincere emotion"
}, {
  id: "nostalgic",
  name: "Nostalgic",
  description: "Fond, wistful memories of past"
}, {
  id: "romantic",
  name: "Romantic",
  description: "Love, affection, sweet admiration"
}, {
  id: "inspirational",
  name: "Inspirational",
  description: "Uplifting, motivating, positive encouragement"
}, {
  id: "playful",
  name: "Playful",
  description: "Cheerful, lively, mischievous fun"
}, {
  id: "serious",
  name: "Serious",
  description: "Respectful, formal, matter-of-fact"
}];

const completionOptions = [{
  id: "ai-assist",
  name: "Option 1 - AI Assist",
  description: "Let AI help generate your content"
}, {
  id: "write-myself", 
  name: "Option 2 - Write Myself",
  description: "I'll write my own content"
}, {
  id: "no-text",
  name: "Option 3 - I Don't Want Text", 
  description: "Skip text content for now"
}];

const visualStyleOptions = [{
  id: "realistic",
  name: "Realistic", 
  description: "True-to-life photo style"
}, {
  id: "caricature",
  name: "Caricature",
  description: "Exaggerated comedic features"
}, {
  id: "anime", 
  name: "Anime",
  description: "Japanese cartoon aesthetic"
}, {
  id: "3d-animated",
  name: "3D Animated",
  description: "Pixar-style CGI look"
}, {
  id: "illustrated",
  name: "Illustrated", 
  description: "Hand-drawn artistic design"
}, {
  id: "pop-art",
  name: "Pop Art",
  description: "Bold retro comic style"
}];

const subjectOptions = [{
  id: "ai-assist",
  name: "Option 1 - AI Assist",
  description: "Let AI help generate your subject"
}, {
  id: "design-myself",
  name: "Option 2 - Design Myself", 
  description: "I will create my own subject"
}, {
  id: "no-subject",
  name: "Option 3 - I Don't Want a Subject",
  description: "I just want a simple background"
}];

const dimensionOptions = [{
  id: "square",
  name: "Square",
  description: "1:1 aspect ratio"
}, {
  id: "landscape", 
  name: "Landscape",
  description: "16:9 aspect ratio"
}, {
  id: "portrait",
  name: "Portrait", 
  description: "9:16 aspect ratio"
}, {
  id: "custom",
  name: "Custom",
  description: "Define your own dimensions"
}];

const Index = () => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [selectedStyle, setSelectedStyle] = useState<string | null>(null);
  const [selectedSubOption, setSelectedSubOption] = useState<string | null>(null);
  const [selectedPick, setSelectedPick] = useState<string | null>(null);
  const [selectedTextStyle, setSelectedTextStyle] = useState<string | null>(null);
  const [selectedCompletionOption, setSelectedCompletionOption] = useState<string | null>(null);
  const [selectedVisualStyle, setSelectedVisualStyle] = useState<string | null>(null);
  const [selectedSubjectOption, setSelectedSubjectOption] = useState<string | null>(null);
  const [subjectTags, setSubjectTags] = useState<string[]>([]);
  const [subjectTagInput, setSubjectTagInput] = useState<string>("");
  const [isGeneratingSubject, setIsGeneratingSubject] = useState<boolean>(false);
  const [subjectDescription, setSubjectDescription] = useState<string>("");
  const [selectedDimension, setSelectedDimension] = useState<string | null>(null);
  const [customWidth, setCustomWidth] = useState<string>("");
  const [customHeight, setCustomHeight] = useState<string>("");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState<string>("");
  const [wordCount, setWordCount] = useState<string>("10");
  const [generatedOptions, setGeneratedOptions] = useState<string[]>([]);
  const [selectedGeneratedOption, setSelectedGeneratedOption] = useState<string | null>(null);
  const [selectedGeneratedIndex, setSelectedGeneratedIndex] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [subOptionSearchTerm, setSubOptionSearchTerm] = useState<string>("");
  const [isSearchFocused, setIsSearchFocused] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [finalSearchTerm, setFinalSearchTerm] = useState<string>("");
  const [isFinalSearchFocused, setIsFinalSearchFocused] = useState<boolean>(false);
  const [showApiKeyDialog, setShowApiKeyDialog] = useState<boolean>(false);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchResults, setSearchResults] = useState<OpenAISearchResult[]>([]);
  const [searchError, setSearchError] = useState<string>("");
  const [stepTwoText, setStepTwoText] = useState<string>("");
  
  // Add timeout ref for search debouncing
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  // Helper function to check if Step 1 is complete
  const isStep1Complete = (): boolean => {
    if (!selectedStyle) return false;
    
    switch (selectedStyle) {
      case "pop-culture":
        return !!(selectedSubOption && selectedPick);
      case "random":
        return !!selectedSubOption; // Custom topic for random
      case "celebrations":
      case "sports":
      case "daily-life":
      case "vibes-punchlines":
        return !!selectedSubOption;
      default:
        return false;
    }
  };

  // Helper function to check if Step 2 is complete
  const isStep2Complete = (): boolean => {
    if (!selectedTextStyle || !selectedCompletionOption) {
      return false;
    }
    
    // If completion option is AI assist, require a generated option to be selected
    if (selectedCompletionOption === "ai-assist") {
      return !!selectedGeneratedOption;
    }
    
    // If completion option is write myself, require some text (for future use)
    if (selectedCompletionOption === "write-myself") {
      return stepTwoText.trim().length > 0;
    }
    
    // For "no-text" option, just need style and completion
    return true;
  };

  // Helper function to check if Step 3 is complete
  const isStep3Complete = (): boolean => {
    return !!(selectedVisualStyle && selectedSubjectOption);
  };

  // Helper function to check if Step 4 is complete
  const isStep4Complete = (): boolean => {
    if (!selectedDimension) return false;
    if (selectedDimension === "custom") {
      return !!(customWidth && customHeight);
    }
    return true;
  };

  // Handle adding tags
  const handleAddTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags([...tags, trimmedTag]);
    }
    setTagInput("");
  };

  const handleTagInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddTag(tagInput);
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  // Handle adding subject tags
  const handleAddSubjectTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !subjectTags.includes(trimmedTag)) {
      setSubjectTags([...subjectTags, trimmedTag]);
    }
    setSubjectTagInput("");
  };

  const handleSubjectTagInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddSubjectTag(subjectTagInput);
    }
  };

  const removeSubjectTag = (tagToRemove: string) => {
    setSubjectTags(subjectTags.filter(tag => tag !== tagToRemove));
  };

  // Generate subject using AI
  const handleGenerateSubject = async () => {
    setIsGeneratingSubject(true);
    // TODO: Implement subject generation logic
    setTimeout(() => {
      setIsGeneratingSubject(false);
    }, 2000);
  };

  // Generate text using OpenAI
  const handleGenerateText = async () => {
    if (!openAIService.hasApiKey()) {
      setShowApiKeyDialog(true);
      return;
    }

    setIsGenerating(true);
    try {
      // Map selected IDs to human-readable labels
      const selectedStyleObj = styleOptions.find(s => s.id === selectedStyle);
      const selectedTextStyleObj = textStyleOptions.find(ts => ts.id === selectedTextStyle);
      
      let subtopic = '';
      let pick = '';
      
      // Get subtopic based on category
      if (selectedStyle === 'celebrations' && selectedSubOption) {
        const celebOption = celebrationOptions.find(c => c.id === selectedSubOption);
        subtopic = celebOption?.name || selectedSubOption;
      } else if (selectedStyle === 'pop-culture' && selectedSubOption) {
        const popOption = popCultureOptions.find(p => p.id === selectedSubOption);
        subtopic = popOption?.name || selectedSubOption;
        pick = selectedPick || '';
      } else if (selectedSubOption) {
        subtopic = selectedSubOption;
      }

      const options = await openAIService.generateShortTexts({
        tone: selectedTextStyleObj?.name || selectedTextStyle || 'Casual',
        category: selectedStyleObj?.name || selectedStyle,
        subtopic,
        pick,
        tags,
        wordLimit: Number(wordCount)
      });
      
      // Clear previous selection when generating/regenerating
      setSelectedGeneratedOption(null);
      setSelectedGeneratedIndex(null);
      setGeneratedOptions(options);
    } catch (error) {
      console.error('Error generating text:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApiKeySet = (apiKey: string) => {
    openAIService.setApiKey(apiKey);
  };

  const handleSearch = async (searchTerm: string) => {
    if (!searchTerm.trim() || !selectedSubOption) return;
    
    if (!openAIService.hasApiKey()) {
      setShowApiKeyDialog(true);
      return;
    }

    setIsSearching(true);
    setSearchError("");
    setSearchResults([]);

    try {
      const results = await openAIService.searchPopCulture(selectedSubOption, searchTerm);
      setSearchResults(results);
    } catch (error) {
      console.error('Search error:', error);
      setSearchError(error instanceof Error ? error.message : 'Search failed');
      if (error instanceof Error && error.message.includes('API key')) {
        setShowApiKeyDialog(true);
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchInputChange = (value: string) => {
    setFinalSearchTerm(value);
    setSearchResults([]);
    setSearchError("");
    
    // Clear results if search is empty
    if (!value.trim()) {
      return;
    }
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Debounced search - trigger after 250ms of no typing (much faster)
    searchTimeoutRef.current = setTimeout(() => {
      if (value.trim()) {
        handleSearch(value);
      }
    }, 250);
  };

  return <div className="min-h-screen bg-background py-12 px-4 pb-32">
      <div className="max-w-6xl mx-auto">
        {/* Step Progress Header */}
        <StepProgress currentStep={currentStep} />
        
        {currentStep === 1 && (
          <>
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold mb-4 text-[#0db0de]">Choose Your Viibe Category</h1>
              <p className="text-xl text-muted-foreground">Select the Category that best fits your Viibe</p>
            </div>
            
            {/* Show all cards when no style is selected, or only the selected card */}
        {!selectedStyle ? <>
            {/* Search Bar */}
            <div className="max-w-md mx-auto mb-12">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="Search styles..." className="pl-10 text-center border-2 border-border bg-card hover:bg-accent/50 transition-colors p-6 h-auto min-h-[60px] text-base font-medium rounded-lg" />
              </div>
            </div>

            {(() => {
          const filteredStyles = styleOptions.filter(style => style.name.toLowerCase().includes(searchTerm.toLowerCase()) || style.description.toLowerCase().includes(searchTerm.toLowerCase()));
          return filteredStyles.length > 0 ? <div className="space-y-6">
                  {/* Top row - First 3 items */}
                  {filteredStyles.length > 0 && <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 justify-items-center">
                      {filteredStyles.slice(0, 3).map(style => <Card key={style.id} className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1 hover:bg-accent/50 w-full max-w-sm" onClick={() => setSelectedStyle(style.id)}>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-lg font-semibold text-card-foreground">
                              {style.name}
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <CardDescription className="text-sm text-muted-foreground">
                              {style.description}
                            </CardDescription>
                          </CardContent>
                        </Card>)}
                    </div>}
                  
                  {/* Bottom row - Last 3 items */}
                  {filteredStyles.length > 3 && <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 justify-items-center">
                      {filteredStyles.slice(3, 6).map(style => <Card key={style.id} className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1 hover:bg-accent/50 w-full max-w-sm" onClick={() => setSelectedStyle(style.id)}>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-lg font-semibold text-card-foreground">
                              {style.name}
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <CardDescription className="text-sm text-muted-foreground">
                              {style.description}
                            </CardDescription>
                          </CardContent>
                        </Card>)}
                    </div>}
                </div> : <div className="text-center py-12">
                  <p className="text-lg text-muted-foreground">No styles match your search</p>
                  <p className="text-sm text-muted-foreground mt-2">Try a different search term</p>
                </div>;
        })()}
          </> : <div className="flex flex-col items-stretch animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Selected Style Card */}
            <div className="mb-8 selected-card">
              <Card className="w-full border-[#0db0de] bg-[#0db0de]/5 shadow-md">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-semibold text-[#0db0de] text-center flex items-center justify-center gap-2">
                    {styleOptions.find(s => s.id === selectedStyle)?.name}
                    <span className="text-sm">✓</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm text-muted-foreground text-center">
                    {styleOptions.find(s => s.id === selectedStyle)?.description}
                  </CardDescription>
                  <div className="text-center mt-3">
                    <button onClick={() => {
                  setSelectedStyle(null);
                  setSelectedSubOption(null);
                  setSelectedPick(null);
                  setSubOptionSearchTerm("");
                }} className="text-xs text-primary hover:text-primary/80 underline transition-colors">
                      Change selection
                    </button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Celebrations Dropdown - Only show for celebrations style */}
            {selectedStyle === "celebrations" && !selectedSubOption ? <div className="selected-card mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="text-center mb-6">
                  <p className="text-xl text-muted-foreground">Choose a specific celebration</p>
                </div>
                
                <div className="space-y-4">
                  {/* Search Input */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input value={subOptionSearchTerm} onChange={e => setSubOptionSearchTerm(e.target.value)} onFocus={() => setIsSearchFocused(true)} onBlur={() => {
                // Delay hiding the list to allow clicks to complete
                setTimeout(() => setIsSearchFocused(false), 150);
              }} placeholder="Search celebrations..." className="pl-10 text-center border-2 border-border bg-card hover:bg-accent/50 transition-colors p-6 h-auto min-h-[60px] text-base font-medium rounded-lg" />
                  </div>

                  {/* Celebrations List */}
                  {(isSearchFocused || subOptionSearchTerm.length > 0) && <Card className="max-h-96 overflow-hidden">
                      <ScrollArea className="h-96">
                        <div className="p-4 space-y-2">
                          {(() => {
                    const filteredCelebrations = celebrationOptions.filter(celebration => celebration.name.toLowerCase().includes(subOptionSearchTerm.toLowerCase()));
                    return filteredCelebrations.length > 0 ? filteredCelebrations.map(celebration => <div key={celebration.id} onClick={e => {
                      console.log('Celebration clicked:', celebration.name);
                      e.preventDefault();
                      e.stopPropagation();
                      setSelectedSubOption(celebration.name);
                      setIsSearchFocused(false);
                      setSubOptionSearchTerm("");
                    }} className="p-3 rounded-lg border border-border hover:bg-accent/50 cursor-pointer transition-colors">
                                  <p className="text-sm font-medium text-card-foreground">
                                    {celebration.name}
                                  </p>
                                </div>) : subOptionSearchTerm.trim() ? <div onClick={e => {
                      console.log('Custom celebration clicked:', subOptionSearchTerm.trim());
                      e.preventDefault();
                      e.stopPropagation();
                      setSelectedSubOption(subOptionSearchTerm.trim());
                      setIsSearchFocused(false);
                      setSubOptionSearchTerm("");
                    }} className="p-3 rounded-lg border border-dashed border-border hover:bg-accent/50 cursor-pointer transition-colors flex items-center gap-2">
                                <div className="w-4 h-4 rounded-full border border-muted-foreground flex items-center justify-center">
                                  <span className="text-xs font-bold text-muted-foreground">+</span>
                                </div>
                                <p className="text-sm font-medium text-card-foreground">
                                  Add "{subOptionSearchTerm.trim()}" as custom celebration
                                </p>
                              </div> : <div className="text-center py-8">
                                <p className="text-muted-foreground">Start typing to search celebrations</p>
                              </div>;
                  })()}
                        </div>
                      </ScrollArea>
                    </Card>}
                </div>
              </div> : selectedStyle === "celebrations" && selectedSubOption ? <div className="flex flex-col items-stretch">
                 {/* Selected Celebration Card */}
                 <div className="mb-8 selected-card">
                   <Card className="w-full border-[#0db0de] bg-[#0db0de]/5 shadow-md">
                    <CardHeader className="pb-3">
                       <CardTitle className="text-lg font-semibold text-[#0db0de] text-center flex items-center justify-center gap-2">
                         {selectedSubOption}
                         <span className="text-sm">✓</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-sm text-muted-foreground text-center">
                        Selected celebration
                      </CardDescription>
                      <div className="text-center mt-3">
                        <button onClick={() => {
                    setSelectedSubOption(null);
                    setSelectedPick(null);
                    setSubOptionSearchTerm("");
                  }} className="text-xs text-primary hover:text-primary/80 underline transition-colors">
                          Change celebration
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                </div>

              </div> : selectedStyle === "sports" && !selectedSubOption ? <div className="selected-card mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="text-center mb-6">
                  <p className="text-xl text-muted-foreground">Choose a specific sport</p>
                </div>
                
                <div className="space-y-4">
                  {/* Search Input */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input value={subOptionSearchTerm} onChange={e => setSubOptionSearchTerm(e.target.value)} onFocus={() => setIsSearchFocused(true)} onBlur={() => {
                // Delay hiding the list to allow clicks to complete
                setTimeout(() => setIsSearchFocused(false), 150);
              }} placeholder="Search sports..." className="pl-10 text-center border-2 border-border bg-card hover:bg-accent/50 transition-colors p-6 h-auto min-h-[60px] text-base font-medium rounded-lg" />
                  </div>

                  {/* Sports List */}
                  {(isSearchFocused || subOptionSearchTerm.length > 0) && <Card className="max-h-96 overflow-hidden">
                      <ScrollArea className="h-96">
                        <div className="p-4 space-y-2">
                          {(() => {
                    const filteredSports = sportsOptions.filter(sport => sport.name.toLowerCase().includes(subOptionSearchTerm.toLowerCase()));
                    return filteredSports.length > 0 ? filteredSports.map(sport => <div key={sport.id} onClick={e => {
                      console.log('Sport clicked:', sport.name);
                      e.preventDefault();
                      e.stopPropagation();
                      setSelectedSubOption(sport.name);
                      setIsSearchFocused(false);
                      setSubOptionSearchTerm("");
                    }} className="p-3 rounded-lg border border-border hover:bg-accent/50 cursor-pointer transition-colors">
                                  <p className="text-sm font-medium text-card-foreground">
                                    {sport.name}
                                  </p>
                                </div>) : subOptionSearchTerm.trim() ? <div onClick={e => {
                      console.log('Custom sport clicked:', subOptionSearchTerm.trim());
                      e.preventDefault();
                      e.stopPropagation();
                      setSelectedSubOption(subOptionSearchTerm.trim());
                      setIsSearchFocused(false);
                      setSubOptionSearchTerm("");
                    }} className="p-3 rounded-lg border border-dashed border-border hover:bg-accent/50 cursor-pointer transition-colors flex items-center gap-2">
                                <div className="w-4 h-4 rounded-full border border-muted-foreground flex items-center justify-center">
                                  <span className="text-xs font-bold text-muted-foreground">+</span>
                                </div>
                                <p className="text-sm font-medium text-card-foreground">
                                  Add '{subOptionSearchTerm.trim()}' as custom sport
                                </p>
                              </div> : <div className="p-8 text-center text-muted-foreground">
                                <p>No sports found</p>
                              </div>;
                  })()}
                        </div>
                      </ScrollArea>
                    </Card>}
                </div>
              </div> : selectedStyle === "daily-life" && !selectedSubOption ? <div className="selected-card mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="text-center mb-6">
                  <p className="text-xl text-muted-foreground">Choose a specific daily life activity</p>
                </div>
                
                <div className="space-y-4">
                  {/* Search Input */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input value={subOptionSearchTerm} onChange={e => setSubOptionSearchTerm(e.target.value)} onFocus={() => setIsSearchFocused(true)} onBlur={() => {
                // Delay hiding the list to allow clicks to complete
                setTimeout(() => setIsSearchFocused(false), 150);
              }} placeholder="Search daily life activities..." className="pl-10 text-center border-2 border-border bg-card hover:bg-accent/50 transition-colors p-6 h-auto min-h-[60px] text-base font-medium rounded-lg" />
                  </div>

                  {/* Daily Life List */}
                  {(isSearchFocused || subOptionSearchTerm.length > 0) && <Card className="max-h-96 overflow-hidden">
                      <ScrollArea className="h-96">
                        <div className="p-4 space-y-2">
                          {(() => {
                    const filteredDailyLife = dailyLifeOptions.filter(activity => activity.name.toLowerCase().includes(subOptionSearchTerm.toLowerCase()));
                    return filteredDailyLife.length > 0 ? filteredDailyLife.map(activity => <div key={activity.id} onClick={e => {
                      console.log('Daily life activity clicked:', activity.name);
                      e.preventDefault();
                      e.stopPropagation();
                      setSelectedSubOption(activity.name);
                      setIsSearchFocused(false);
                      setSubOptionSearchTerm("");
                    }} className="p-3 rounded-lg border border-border hover:bg-accent/50 cursor-pointer transition-colors">
                                  <p className="text-sm font-medium text-card-foreground">
                                    {activity.name}
                                  </p>
                                </div>) : subOptionSearchTerm.trim() ? <div onClick={e => {
                      console.log('Custom daily life clicked:', subOptionSearchTerm.trim());
                      e.preventDefault();
                      e.stopPropagation();
                      setSelectedSubOption(subOptionSearchTerm.trim());
                      setIsSearchFocused(false);
                      setSubOptionSearchTerm("");
                    }} className="p-3 rounded-lg border border-dashed border-border hover:bg-accent/50 cursor-pointer transition-colors flex items-center gap-2">
                                <div className="w-4 h-4 rounded-full border border-muted-foreground flex items-center justify-center">
                                  <span className="text-xs font-bold text-muted-foreground">+</span>
                                </div>
                                <p className="text-sm font-medium text-card-foreground">
                                  Add "{subOptionSearchTerm.trim()}" as custom activity
                                </p>
                              </div> : <div className="text-center py-8">
                                <p className="text-muted-foreground">Start typing to search activities</p>
                              </div>;
                  })()}
                        </div>
                      </ScrollArea>
                    </Card>}
                </div>
              </div> : selectedStyle === "daily-life" && selectedSubOption ? <div className="flex flex-col items-stretch">
                 {/* Selected Daily Life Card */}
                 <div className="mb-8 selected-card">
                   <Card className="w-full border-[#0db0de] bg-[#0db0de]/5 shadow-md">
                    <CardHeader className="pb-3">
                       <CardTitle className="text-lg font-semibold text-[#0db0de] text-center flex items-center justify-center gap-2">
                         {selectedSubOption}
                         <span className="text-sm">✓</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-sm text-muted-foreground text-center">
                        Selected daily life activity
                      </CardDescription>
                      <div className="text-center mt-3">
                        <button onClick={() => {
                    setSelectedSubOption(null);
                    setSubOptionSearchTerm("");
                  }} className="text-xs text-primary hover:text-primary/80 underline transition-colors">
                          Change activity
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                </div>

              </div> : selectedStyle === "sports" && selectedSubOption ? <div className="flex flex-col items-stretch">
                 {/* Selected Sport Card */}
                 <div className="mb-8 selected-card">
                   <Card className="w-full border-[#0db0de] bg-[#0db0de]/5 shadow-md">
                    <CardHeader className="pb-3">
                       <CardTitle className="text-lg font-semibold text-[#0db0de] text-center flex items-center justify-center gap-2">
                         {selectedSubOption}
                         <span className="text-sm">✓</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-sm text-muted-foreground text-center">
                        Selected sport
                      </CardDescription>
                      <div className="text-center mt-3">
                        <button onClick={() => {
                    setSelectedSubOption(null);
                    setSubOptionSearchTerm("");
                  }} className="text-xs text-primary hover:text-primary/80 underline transition-colors">
                          Change sport
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                </div>

              </div> : selectedStyle === "vibes-punchlines" && !selectedSubOption ? <div className="selected-card mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="text-center mb-6">
                  <p className="text-xl text-muted-foreground">Choose a specific vibe or punchline style</p>
                </div>
                
                <div className="space-y-4">
                  {/* Search Input */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input value={subOptionSearchTerm} onChange={e => setSubOptionSearchTerm(e.target.value)} onFocus={() => setIsSearchFocused(true)} onBlur={() => {
                // Delay hiding the list to allow clicks to complete
                setTimeout(() => setIsSearchFocused(false), 150);
              }} placeholder="Search vibes & punchlines..." className="pl-10 text-center border-2 border-border bg-card hover:bg-accent/50 transition-colors p-6 h-auto min-h-[60px] text-base font-medium rounded-lg" />
                  </div>

                  {/* Vibes & Punchlines List */}
                  {(isSearchFocused || subOptionSearchTerm.length > 0) && <Card className="max-h-96 overflow-hidden">
                      <ScrollArea className="h-96">
                        <div className="p-4 space-y-2">
                          {(() => {
                    const filteredVibes = vibesPunchlinesOptions.filter(vibe => 
                      (vibe.name + " " + vibe.subtitle).toLowerCase().includes(subOptionSearchTerm.toLowerCase())
                    );
                    return filteredVibes.length > 0 ? filteredVibes.map(vibe => <div key={vibe.id} onClick={e => {
                      console.log('Vibe clicked:', vibe.name);
                      e.preventDefault();
                      e.stopPropagation();
                      setSelectedSubOption(vibe.name);
                      setIsSearchFocused(false);
                      setSubOptionSearchTerm("");
                    }} className="p-3 rounded-lg border border-border hover:bg-accent/50 cursor-pointer transition-colors">
                                  <p className="text-sm font-medium text-card-foreground">
                                    {vibe.name}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {vibe.subtitle}
                                  </p>
                                </div>) : subOptionSearchTerm.trim() ? <div onClick={e => {
                      console.log('Custom vibe clicked:', subOptionSearchTerm.trim());
                      e.preventDefault();
                      e.stopPropagation();
                      setSelectedSubOption(subOptionSearchTerm.trim());
                      setIsSearchFocused(false);
                      setSubOptionSearchTerm("");
                    }} className="p-3 rounded-lg border border-dashed border-border hover:bg-accent/50 cursor-pointer transition-colors flex items-center gap-2">
                                <div className="w-4 h-4 rounded-full border border-muted-foreground flex items-center justify-center">
                                  <span className="text-xs font-bold text-muted-foreground">+</span>
                                </div>
                                <p className="text-sm font-medium text-card-foreground">
                                  Add "{subOptionSearchTerm.trim()}" as custom vibe
                                </p>
                              </div> : <div className="text-center py-8">
                                <p className="text-muted-foreground">Start typing to search vibes & punchlines</p>
                              </div>;
                  })()}
                        </div>
                      </ScrollArea>
                    </Card>}
                </div>
              </div> : selectedStyle === "vibes-punchlines" && selectedSubOption ? <div className="flex flex-col items-stretch">
                {/* Selected Vibe/Punchline Card */}
                <div className="mb-8 selected-card">
                  <Card className="w-full border-[#0db0de] bg-[#0db0de]/5 shadow-md">
                    <CardHeader className="pb-3">
                     <CardTitle className="text-lg font-semibold text-[#0db0de] text-center flex items-center justify-center gap-2">
                       {selectedSubOption}
                       <span className="text-sm">✓</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-sm text-muted-foreground text-center">
                        {(() => {
                          const selectedVibe = vibesPunchlinesOptions.find(vibe => vibe.name === selectedSubOption);
                          return selectedVibe ? selectedVibe.subtitle : "Selected vibe/punchline";
                        })()}
                      </CardDescription>
                      <div className="text-center mt-3">
                        <button onClick={() => {
                    setSelectedSubOption(null);
                    setSubOptionSearchTerm("");
                  }} className="text-xs text-primary hover:text-primary/80 underline transition-colors">
                          Change
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                </div>

              </div> : selectedStyle === "pop-culture" && !selectedSubOption ? <div className="selected-card mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="text-center mb-6">
                  <p className="text-xl text-muted-foreground">Choose a specific pop culture topic</p>
                </div>
                
                <div className="space-y-4">
                  {/* Search Input */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input value={subOptionSearchTerm} onChange={e => setSubOptionSearchTerm(e.target.value)} onFocus={() => setIsSearchFocused(true)} onBlur={() => {
                // Delay hiding the list to allow clicks to complete
                setTimeout(() => setIsSearchFocused(false), 150);
              }} placeholder="Search pop culture..." className="pl-10 text-center border-2 border-border bg-card hover:bg-accent/50 transition-colors p-6 h-auto min-h-[60px] text-base font-medium rounded-lg" />
                  </div>

                  {/* Pop Culture List */}
                  {(isSearchFocused || subOptionSearchTerm.length > 0) && <Card className="max-h-96 overflow-hidden">
                      <ScrollArea className="h-96">
                        <div className="p-4 space-y-2">
                          {(() => {
                    const filteredPopCulture = popCultureOptions.filter(item => item.name.toLowerCase().includes(subOptionSearchTerm.toLowerCase()) || item.subtitle.toLowerCase().includes(subOptionSearchTerm.toLowerCase()));
                    return filteredPopCulture.length > 0 ? filteredPopCulture.map(item => <div key={item.id} onClick={e => {
                      console.log('Pop culture clicked:', item.name);
                      e.preventDefault();
                      e.stopPropagation();
                      setSelectedSubOption(item.name);
                      setIsSearchFocused(false);
                      setSubOptionSearchTerm("");
                    }} className="p-3 rounded-lg border border-border hover:bg-accent/50 cursor-pointer transition-colors">
                                  <p className="text-sm font-medium text-card-foreground">
                                    {item.name}
                                  </p>
                                  <p className="text-xs text-muted-foreground mt-1">
                                    {item.subtitle}
                                  </p>
                                </div>) : subOptionSearchTerm.trim() ? <div onClick={e => {
                      console.log('Custom pop culture clicked:', subOptionSearchTerm.trim());
                      e.preventDefault();
                      e.stopPropagation();
                      setSelectedSubOption(subOptionSearchTerm.trim());
                      setIsSearchFocused(false);
                      setSubOptionSearchTerm("");
                    }} className="p-3 rounded-lg border border-dashed border-border hover:bg-accent/50 cursor-pointer transition-colors flex items-center gap-2">
                                <div className="w-4 h-4 rounded-full border border-muted-foreground flex items-center justify-center">
                                  <span className="text-xs font-bold text-muted-foreground">+</span>
                                </div>
                                <p className="text-sm font-medium text-card-foreground">
                                  Add "{subOptionSearchTerm.trim()}" as custom pop culture topic
                                </p>
                              </div> : <div className="text-center py-8">
                                <p className="text-muted-foreground">Start typing to search pop culture</p>
                              </div>;
                  })()}
                        </div>
                      </ScrollArea>
                    </Card>}
                </div>
              </div> : selectedStyle === "pop-culture" && selectedSubOption ? <div className="flex flex-col items-stretch">
                {/* Selected Pop Culture Card */}
                <div className="mb-8 selected-card">
                  <Card className="w-full border-[#0db0de] bg-[#0db0de]/5 shadow-md">
                    <CardHeader className="pb-3">
                     <CardTitle className="text-lg font-semibold text-[#0db0de] text-center flex items-center justify-center gap-2">
                       {selectedSubOption}
                       <span className="text-sm">✓</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-sm text-muted-foreground text-center">
                        {(() => {
                          const selectedPopCulture = popCultureOptions.find(item => item.name === selectedSubOption);
                          return selectedPopCulture ? selectedPopCulture.subtitle : "Selected pop culture topic";
                        })()}
                      </CardDescription>
                      <div className="text-center mt-3">
                        <button onClick={() => {
                    setSelectedSubOption(null);
                    setSelectedPick(null);
                    setSubOptionSearchTerm("");
                  }} className="text-xs text-primary hover:text-primary/80 underline transition-colors">
                          Change topic
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Search Box for Pop Culture - Only show when no selection is made */}
                {!selectedPick && (
                  <div className="selected-card mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="text-center mb-6">
                      <p className="text-xl text-muted-foreground">Search within {selectedSubOption}</p>
                    </div>
                    
                    <div className="space-y-4">
                      {/* Search Input */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                        <Input 
                          value={finalSearchTerm} 
                          onChange={e => handleSearchInputChange(e.target.value)} 
                          onFocus={() => setIsFinalSearchFocused(true)} 
                          onBlur={() => {
                            // Delay hiding to allow clicks to complete
                            setTimeout(() => setIsFinalSearchFocused(false), 150);
                          }} 
                          placeholder={`Search ${selectedSubOption.toLowerCase()}...`} 
                          className="pl-10 text-center border-2 border-border bg-card hover:bg-accent/50 transition-colors p-6 h-auto min-h-[60px] text-base font-medium rounded-lg" 
                        />
                        {isSearching && (
                          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                          </div>
                        )}
                      </div>

                      {/* Search Results */}
                      {(isFinalSearchFocused || finalSearchTerm.length > 0) && finalSearchTerm.trim() && (
                        <Card className="max-h-96 overflow-hidden bg-card border-border z-50">
                          <ScrollArea className="h-full">
                            <div className="p-4 space-y-2">
                              {/* Error State */}
                              {searchError && (
                                <div className="p-3 rounded-lg border border-destructive/20 bg-destructive/5 flex items-center gap-2">
                                  <AlertCircle className="h-4 w-4 text-destructive" />
                                  <p className="text-sm text-destructive">{searchError}</p>
                                </div>
                              )}

                              {/* Loading State */}
                              {isSearching && !searchError && (
                                <div className="p-3 rounded-lg border border-dashed border-border bg-card flex items-center gap-2">
                                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                  <p className="text-sm text-muted-foreground">
                                    Searching {selectedSubOption.toLowerCase()}...
                                  </p>
                                </div>
                              )}

                              {/* AI Results */}
                              {searchResults.length > 0 && !isSearching && (
                                <>
                                  {searchResults.map((result, index) => (
                                     <div 
                                       key={index}
                                       onClick={e => {
                                         console.log('AI result clicked:', result.title);
                                         e.preventDefault();
                                         e.stopPropagation();
                                         setSelectedPick(result.title);
                                         setIsFinalSearchFocused(false);
                                         setFinalSearchTerm("");
                                         setSearchResults([]);
                                         setIsSearching(false);
                                         setSearchError(null);
                                       }} 
                                       className="p-3 rounded-lg border border-border hover:bg-accent/50 cursor-pointer transition-colors bg-card"
                                     >
                                      <div className="flex items-start gap-3">
                                        <div className="w-4 h-4 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                          <span className="text-xs font-bold text-primary">AI</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-medium text-card-foreground mb-1">
                                            {result.title}
                                          </p>
                                          <p className="text-xs text-muted-foreground line-clamp-2">
                                            {result.description}
                                          </p>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </>
                              )}

                              {/* Manual Search Option */}
                              {!isSearching && (
                                <div 
                                  onClick={e => {
                                    console.log('Manual search clicked:', finalSearchTerm.trim());
                                    e.preventDefault();
                                    e.stopPropagation();
                                    setSelectedPick(finalSearchTerm.trim());
                                    setIsFinalSearchFocused(false);
                                    setFinalSearchTerm("");
                                    setSearchResults([]);
                                    setIsSearching(false);
                                    setSearchError(null);
                                  }} 
                                  className="p-3 rounded-lg border border-dashed border-border hover:bg-accent/50 cursor-pointer transition-colors flex items-center gap-2 bg-card"
                                >
                                  <div className="w-4 h-4 rounded-full border border-muted-foreground flex items-center justify-center">
                                    <span className="text-xs font-bold text-muted-foreground">+</span>
                                  </div>
                                  <p className="text-sm font-medium text-card-foreground">
                                    Search for "{finalSearchTerm.trim()}" in {selectedSubOption}
                                  </p>
                                </div>
                              )}
                            </div>
                          </ScrollArea>
                        </Card>
                      )}
                    </div>
                  </div>
                )}

                {/* Selected Pick Card for Pop Culture */}
                {selectedPick && (
                  <div className="mb-8 selected-card animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <Card className="w-full border-[#0db0de] bg-[#0db0de]/5 shadow-md">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg font-semibold text-[#0db0de] text-center flex items-center justify-center gap-2">
                          {selectedPick}
                          <span className="text-sm">✓</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <CardDescription className="text-sm text-muted-foreground text-center">
                          Selected pick from {selectedSubOption}
                        </CardDescription>
                        <div className="text-center mt-3">
                          <button onClick={() => {
                            setSelectedPick(null);
                          }} className="text-xs text-primary hover:text-primary/80 underline transition-colors">
                            Change selection
                          </button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

              </div> : selectedStyle === "random" && !selectedSubOption ? <div className="selected-card mb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="text-center mb-6">
                  <p className="text-xl text-muted-foreground">Enter your custom topic</p>
                </div>
                
                <div className="space-y-4">
                  {/* Search Input */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input 
                      value={subOptionSearchTerm} 
                      onChange={e => setSubOptionSearchTerm(e.target.value)} 
                      onFocus={() => setIsSearchFocused(true)} 
                      onBlur={() => {
                        // Delay hiding the list to allow clicks to complete
                        setTimeout(() => setIsSearchFocused(false), 150);
                      }} 
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && subOptionSearchTerm.trim()) {
                          setSelectedSubOption(subOptionSearchTerm.trim());
                          setIsSearchFocused(false);
                          setSubOptionSearchTerm("");
                        }
                      }}
                      placeholder="Type any topic..." 
                      className="pl-10 text-center border-2 border-border bg-card hover:bg-accent/50 transition-colors p-6 h-auto min-h-[60px] text-base font-medium rounded-lg" 
                    />
                  </div>

                  {/* Custom Topic Option */}
                  {subOptionSearchTerm.trim() && <Card className="max-h-96 overflow-hidden">
                      <div className="p-4">
                        <div 
                          onClick={e => {
                            console.log('Custom topic clicked:', subOptionSearchTerm.trim());
                            e.preventDefault();
                            e.stopPropagation();
                            setSelectedSubOption(subOptionSearchTerm.trim());
                            setIsSearchFocused(false);
                            setSubOptionSearchTerm("");
                          }} 
                          className="p-3 rounded-lg border border-dashed border-border hover:bg-accent/50 cursor-pointer transition-colors flex items-center gap-2"
                        >
                          <div className="w-4 h-4 rounded-full border border-muted-foreground flex items-center justify-center">
                            <span className="text-xs font-bold text-muted-foreground">+</span>
                          </div>
                          <p className="text-sm font-medium text-card-foreground">
                            Use "{subOptionSearchTerm.trim()}" as your topic
                          </p>
                        </div>
                      </div>
                    </Card>}
                </div>
              </div> : selectedStyle === "random" && selectedSubOption ? <div className="flex flex-col items-stretch">
                {/* Selected Custom Topic Card */}
                <div className="mb-8 selected-card">
                  <Card className="w-full border-[#0db0de] bg-[#0db0de]/5 shadow-md">
                    <CardHeader className="pb-3">
                     <CardTitle className="text-lg font-semibold text-[#0db0de] text-center flex items-center justify-center gap-2">
                       {selectedSubOption}
                       <span className="text-sm">✓</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-sm text-muted-foreground text-center">
                        Selected custom topic
                      </CardDescription>
                      <div className="text-center mt-3">
                        <button onClick={() => {
                          setSelectedSubOption(null);
                          setSelectedPick(null);
                          setSubOptionSearchTerm("");
                        }} className="text-xs text-primary hover:text-primary/80 underline transition-colors">
                          Change topic
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div> : null}

          </div>}
          </>
        )}

        {currentStep === 2 && (
          <>
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold mb-4 text-[#0db0de]">Choose Your Vibe Text</h1>
              <p className="text-xl italic">
                {(() => {
                  let breadcrumb = [];
                  
                  // Add main category
                  const selectedStyleObj = styleOptions.find(s => s.id === selectedStyle);
                  if (selectedStyleObj) {
                    breadcrumb.push(selectedStyleObj.name);
                  }
                  
                  // Add subcategory
                  if (selectedSubOption) {
                    if (selectedStyle === 'celebrations') {
                      const celebOption = celebrationOptions.find(c => c.id === selectedSubOption);
                      breadcrumb.push(celebOption?.name || selectedSubOption);
                    } else if (selectedStyle === 'pop-culture') {
                      const popOption = popCultureOptions.find(p => p.id === selectedSubOption);
                      breadcrumb.push(popOption?.name || selectedSubOption);
                    } else {
                      breadcrumb.push(selectedSubOption);
                    }
                  }
                  
                  // Add specific pick for pop culture
                  if (selectedPick && selectedStyle === 'pop-culture') {
                    breadcrumb.push(selectedPick);
                  }
                  
                  // Render breadcrumb with dynamic colors
                  return (
                    <>
                      {breadcrumb.map((item, index) => (
                        <span key={index}>
                          <span className="text-muted-foreground">{item}</span>
                          {index < breadcrumb.length && <span className="text-muted-foreground"> &gt; </span>}
                        </span>
                      ))}
                      <span className="text-[#0db0de]">Your Text</span>
                    </>
                  );
                })()}
              </p>
            </div>

            {/* Show style selection grid when no style is selected */}
            {!selectedTextStyle ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 justify-items-center max-w-6xl mx-auto">
                {textStyleOptions.map(style => (
                  <Card 
                    key={style.id} 
                    className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1 hover:bg-accent/50 w-full max-w-sm"
                    onClick={() => setSelectedTextStyle(style.id)}
                  >
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg font-semibold text-card-foreground">
                        {style.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-sm text-muted-foreground">
                        {style.description}
                      </CardDescription>
                    </CardContent>
                  </Card>
                ))}
              </div>
                ) : (
                  /* Show selected text style card only when no generated option is selected */
                  <div className="flex flex-col items-stretch animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {!selectedGeneratedOption && (
                      <div className="mb-8 selected-card">
                        <Card className="w-full border-[#0db0de] bg-[#0db0de]/5 shadow-md">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-lg font-semibold text-[#0db0de] text-center flex items-center justify-center gap-2">
                              {textStyleOptions.find(s => s.id === selectedTextStyle)?.name}
                              <span className="text-sm">✓</span>
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <CardDescription className="text-sm text-muted-foreground text-center">
                              {textStyleOptions.find(s => s.id === selectedTextStyle)?.description}
                            </CardDescription>
                            <div className="text-center mt-3">
                              <button onClick={() => {
                                setSelectedTextStyle(null);
                                setSelectedCompletionOption(null);
                              }} className="text-xs text-primary hover:text-primary/80 underline transition-colors">
                                Change selection
                              </button>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    )}

                {/* Completion Options */}
                {!selectedCompletionOption ? (
                  <>
                    <div className="text-center mb-6">
                      <p className="text-xl text-muted-foreground">Choose your option for completing your text</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 justify-items-center max-w-4xl mx-auto">
                      {completionOptions.map(option => (
                        <Card 
                          key={option.id} 
                          className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1 hover:bg-accent/50 w-full"
                          onClick={() => setSelectedCompletionOption(option.id)}
                        >
                          <CardHeader className="pb-3">
                            <CardTitle className="text-lg font-semibold text-card-foreground">
                              {option.name}
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <CardDescription className="text-sm text-muted-foreground">
                              {option.description}
                            </CardDescription>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </>
                ) : (
                  /* Show selected completion option when no generated option is selected */
                  !selectedGeneratedOption && (
                    <div className="mb-8 selected-card animate-in fade-in slide-in-from-bottom-4 duration-500">
                      <Card className="w-full border-[#0db0de] bg-[#0db0de]/5 shadow-md">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg font-semibold text-[#0db0de] text-center flex items-center justify-center gap-2">
                            {completionOptions.find(opt => opt.id === selectedCompletionOption)?.name}
                            <span className="text-sm">✓</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <CardDescription className="text-sm text-muted-foreground text-center">
                            {completionOptions.find(opt => opt.id === selectedCompletionOption)?.description}
                          </CardDescription>
                          <div className="text-center mt-3">
                            <button onClick={() => {
                              setSelectedCompletionOption(null);
                              setGeneratedOptions([]);
                              setSelectedGeneratedOption(null);
                              setSelectedGeneratedIndex(null);
                            }} className="text-xs text-primary hover:text-primary/80 underline transition-colors">
                              Change selection
                            </button>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )
                )}

                {/* Show AI Assist form when selected and no options generated yet */}
                {selectedCompletionOption === "ai-assist" && generatedOptions.length === 0 && (
                  <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="text-center mb-6">
                      <p className="text-xl text-muted-foreground">Add relevant tags for content generation</p>
                    </div>

                    <div className="max-w-md mx-auto space-y-6">
                      {/* Tags Input */}
                      <div className="space-y-3">
                        <Input
                          value={tagInput}
                          onChange={(e) => setTagInput(e.target.value)}
                          onKeyDown={handleTagInputKeyDown}
                          placeholder="Enter tags (press Enter or comma to add)"
                          className="text-center border-2 border-border bg-card hover:bg-accent/50 transition-colors p-6 h-auto min-h-[60px] text-base font-medium rounded-lg"
                        />
                        
                        {/* Display Tags */}
                        {tags.length > 0 && (
                          <div className="flex flex-wrap gap-2 justify-center">
                            {tags.map((tag, index) => (
                              <Badge 
                                key={index} 
                                variant="secondary" 
                                className="px-3 py-1 text-sm flex items-center gap-1"
                              >
                                {tag}
                                <X 
                                  className="h-3 w-3 cursor-pointer hover:text-destructive" 
                                  onClick={() => removeTag(tag)}
                                />
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Word Count Selection */}
                      <div className="flex items-center justify-center gap-4">
                        <label className="text-sm font-medium text-card-foreground">
                          # of words
                        </label>
                        <Select value={wordCount} onValueChange={setWordCount}>
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="5">5 Words</SelectItem>
                            <SelectItem value="10">10 Words</SelectItem>
                            <SelectItem value="15">15 Words</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Generate Button */}
                      <div className="text-center">
                        <Button 
                          variant="brand"
                          className="px-8 py-3 text-base font-medium rounded-lg"
                          onClick={handleGenerateText}
                          disabled={isGenerating}
                        >
                          {isGenerating ? (
                            <>
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              Generating...
                            </>
                          ) : (
                            "Generate Text Now"
                          )}
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Show generated options box when options exist but no selection made yet */}
                {selectedCompletionOption === "ai-assist" && generatedOptions.length > 0 && !selectedGeneratedOption && (
                  <div className="mb-8 selected-card animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <Card className="w-full border-[#0db0de] bg-[#0db0de]/5 shadow-md">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-lg font-semibold text-[#0db0de] text-center flex items-center justify-center gap-2">
                          Text options generated
                          <span className="text-sm">✓</span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <CardDescription className="text-sm text-muted-foreground text-center">
                          {wordCount} words max{tags.length > 0 ? `, tags: ${tags.join(", ")}` : ""}
                        </CardDescription>
                        <div className="text-center mt-3">
                            <button onClick={() => {
                              setGeneratedOptions([]);
                              setSelectedGeneratedOption(null);
                              setSelectedGeneratedIndex(null);
                            }} className="text-xs text-primary hover:text-primary/80 underline transition-colors">
                              Change selection
                            </button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {/* Show stacked selections when text option is selected */}
                {selectedGeneratedOption && (
                  <div className="flex flex-col items-stretch animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-4 mb-8">
                    {/* Show selected text style */}
                    <div className="selected-card">
                      <Card className="w-full border-[#0db0de] bg-[#0db0de]/5 shadow-md">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg font-semibold text-[#0db0de] text-center flex items-center justify-center gap-2">
                            {textStyleOptions.find(s => s.id === selectedTextStyle)?.name}
                            <span className="text-sm">✓</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <CardDescription className="text-sm text-muted-foreground text-center">
                            {textStyleOptions.find(s => s.id === selectedTextStyle)?.description}
                          </CardDescription>
                          <div className="text-center mt-3">
                            <button onClick={() => {
                              setSelectedTextStyle(null);
                              setSelectedCompletionOption(null);
                              setGeneratedOptions([]);
                              setSelectedGeneratedOption(null);
                            }} className="text-xs text-primary hover:text-primary/80 underline transition-colors">
                              Change selection
                            </button>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Show selected completion option */}
                    <div className="selected-card">
                      <Card className="w-full border-[#0db0de] bg-[#0db0de]/5 shadow-md">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg font-semibold text-[#0db0de] text-center flex items-center justify-center gap-2">
                            {completionOptions.find(opt => opt.id === selectedCompletionOption)?.name}
                            <span className="text-sm">✓</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <CardDescription className="text-sm text-muted-foreground text-center">
                            {completionOptions.find(opt => opt.id === selectedCompletionOption)?.description}
                          </CardDescription>
                          <div className="text-center mt-3">
                            <button onClick={() => {
                              setSelectedCompletionOption(null);
                              setGeneratedOptions([]);
                              setSelectedGeneratedOption(null);
                            }} className="text-xs text-primary hover:text-primary/80 underline transition-colors">
                              Change selection
                            </button>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Show selected generated text option */}
                    <div className="selected-card">
                      <Card className="w-full border-[#0db0de] bg-[#0db0de]/5 shadow-md">
                        <CardHeader className="pb-3">
                        <CardTitle className="text-lg font-semibold text-[#0db0de] text-center flex items-center justify-center gap-2">
                          Option {selectedGeneratedIndex !== null ? selectedGeneratedIndex + 1 : 1}
                          <span className="text-sm">✓</span>
                        </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <CardDescription className="text-sm text-muted-foreground text-center">
                            {selectedGeneratedOption}
                          </CardDescription>
                          <div className="text-center mt-3">
                            <button onClick={() => setSelectedGeneratedOption(null)} className="text-xs text-primary hover:text-primary/80 underline transition-colors">
                              Change selection
                            </button>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )}

                {/* Generated Text Options Grid - Show when options exist */}
                {generatedOptions.length > 0 && selectedCompletionOption === "ai-assist" && (
                  <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="text-center mb-6">
                      <p className="text-xl text-muted-foreground">Choose one of the generated text options</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-6">
                      {generatedOptions.map((option, index) => (
                        <Card 
                          key={index}
                          className={`cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1 p-4 ${
                            selectedGeneratedOption === option 
                              ? "border-[#0db0de] bg-[#0db0de]/5 shadow-md" 
                              : "hover:bg-accent/50"
                          }`}
                          onClick={() => {
                            setSelectedGeneratedOption(option);
                            setSelectedGeneratedIndex(index);
                          }}
                        >
                          <div className="space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-muted-foreground">
                                Option {index + 1}
                              </span>
                              {selectedGeneratedOption === option && (
                                <span className="text-[#0db0de] text-sm">✓</span>
                              )}
                            </div>
                            <p className="text-sm text-card-foreground leading-relaxed">
                              {option}
                            </p>
                          </div>
                        </Card>
                      ))}
                    </div>

                    <div className="text-center">
                      <Button 
                        variant="outline"
                        onClick={handleGenerateText}
                        disabled={isGenerating}
                        className="px-6 py-2"
                      >
                        {isGenerating ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Regenerating...
                          </>
                        ) : (
                          "Regenerate Text"
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                {/* Show write myself form when write-myself is selected */}
                {selectedCompletionOption === "write-myself" && (
                  <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="text-center mb-6">
                      <p className="text-xl text-muted-foreground">Write your own text here (max 100 characters)</p>
                    </div>

                    <div className="max-w-lg mx-auto space-y-4">
                      <div className="relative">
                        <Textarea
                          value={stepTwoText}
                          onChange={(e) => {
                            if (e.target.value.length <= 100) {
                              setStepTwoText(e.target.value);
                            }
                          }}
                          placeholder="Start writing your text here..."
                          className="min-h-[100px] text-center border-2 border-border bg-card hover:bg-accent/50 transition-colors p-6 text-base font-medium rounded-lg resize-none"
                          maxLength={100}
                        />
                        
                        {/* Character counter */}
                        <div className="absolute bottom-3 left-3 text-xs text-muted-foreground">
                          {stepTwoText.length}/100
                        </div>
                        
                        {stepTwoText.length >= 100 && (
                          <div className="absolute -bottom-6 left-0 right-0 text-center">
                            <span className="text-xs text-destructive">You have hit your max characters</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Use this text button */}
                      {stepTwoText.trim().length > 0 && (
                        <div className="flex justify-end">
                          <Button 
                            variant="brand"
                            className="px-6 py-2 text-sm font-medium rounded-lg"
                            onClick={() => {
                              // This will trigger the completion validation in isStep2Complete
                              // No additional state needed as stepTwoText is already stored
                            }}
                          >
                            Use this text
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* TODO: Add additional sub-options here after text style is selected */}
              </div>
            )}
          </>
        )}

        {currentStep === 3 && (
          <>
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold mb-4 text-[#0db0de]">Describe your subject</h1>
              <p className="text-xl text-muted-foreground">Choose what will be the focus of your image</p>
            </div>

            {/* Show visual style selection grid when no style is selected */}
            {!selectedVisualStyle ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 justify-items-center max-w-6xl mx-auto">
                {visualStyleOptions.map(style => (
                  <Card 
                    key={style.id} 
                    className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1 hover:bg-accent/50 w-full max-w-sm"
                    onClick={() => setSelectedVisualStyle(style.id)}
                  >
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg font-semibold text-card-foreground">
                        {style.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-sm text-muted-foreground">
                        {style.description}
                      </CardDescription>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              /* Show selected visual style card and subject options */
              <div className="flex flex-col items-stretch animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="mb-8 selected-card">
                  <Card className="w-full border-[#0db0de] bg-[#0db0de]/5 shadow-md">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg font-semibold text-[#0db0de] text-center flex items-center justify-center gap-2">
                        {visualStyleOptions.find(s => s.id === selectedVisualStyle)?.name}
                        <span className="text-sm">✓</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-sm text-muted-foreground text-center">
                        {visualStyleOptions.find(s => s.id === selectedVisualStyle)?.description}
                      </CardDescription>
                      <div className="text-center mt-3">
                        <button onClick={() => {
                          setSelectedVisualStyle(null);
                          setSelectedSubjectOption(null);
                        }} className="text-xs text-primary hover:text-primary/80 underline transition-colors">
                          Change selection
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Subject options selection */}
                {!selectedSubjectOption ? (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="text-center mb-8">
                      <p className="text-xl text-muted-foreground">Choose your option for your subject (what's the focus of image)</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                      {subjectOptions.map(option => (
                        <Card 
                          key={option.id}
                          className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1 hover:bg-accent/50 w-full"
                          onClick={() => setSelectedSubjectOption(option.id)}
                        >
                          <CardHeader className="pb-3 text-center">
                            <CardTitle className="text-lg font-semibold text-card-foreground">
                              {option.name}
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <CardDescription className="text-sm text-muted-foreground text-center">
                              {option.description}
                            </CardDescription>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                ) : (
                  /* Show selected subject option and subject generation form if AI Assist */
                  <div className="space-y-6">
                    {/* Selected subject option card */}
                    <div className="selected-card">
                      <Card className="w-full border-[#0db0de] bg-[#0db0de]/5 shadow-md">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg font-semibold text-[#0db0de] text-center flex items-center justify-center gap-2">
                            {subjectOptions.find(s => s.id === selectedSubjectOption)?.name}
                            <span className="text-sm">✓</span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <CardDescription className="text-sm text-muted-foreground text-center">
                            {subjectOptions.find(s => s.id === selectedSubjectOption)?.description}
                          </CardDescription>
                          <div className="text-center mt-3">
                            <button onClick={() => {
                              setSelectedSubjectOption(null);
                              setSubjectTags([]);
                              setSubjectTagInput("");
                              setSubjectDescription("");
                            }} className="text-xs text-primary hover:text-primary/80 underline transition-colors">
                              Change selection
                            </button>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Subject generation form for AI Assist */}
                    {selectedSubjectOption === "ai-assist" && (
                      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="text-center mb-8">
                          <h2 className="text-2xl font-semibold text-muted-foreground mb-4">Add relevant tags for subject generation</h2>
                        </div>

                        <div className="max-w-lg mx-auto space-y-6">
                          {/* Tag Input */}
                          <div className="space-y-2">
                            <Input
                              value={subjectTagInput}
                              onChange={(e) => setSubjectTagInput(e.target.value)}
                              onKeyDown={handleSubjectTagInputKeyDown}
                              placeholder="Enter tags (press Enter or comma to add)"
                              className="text-center border-2 border-border bg-card hover:bg-accent/50 transition-colors p-6 h-auto min-h-[60px] text-base font-medium rounded-lg"
                            />
                            
                            {/* Display tags */}
                            {subjectTags.length > 0 && (
                              <div className="flex flex-wrap gap-2 justify-center">
                                {subjectTags.map((tag, index) => (
                                  <Badge key={index} variant="secondary" className="text-sm px-3 py-1">
                                    {tag}
                                    <X 
                                      className="h-3 w-3 ml-2 cursor-pointer hover:text-destructive transition-colors" 
                                      onClick={() => removeSubjectTag(tag)}
                                    />
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Generate Button */}
                          <div className="text-center">
                            <Button 
                              variant="brand"
                              className="px-8 py-3 text-base font-medium rounded-lg"
                              onClick={handleGenerateSubject}
                              disabled={isGeneratingSubject}
                            >
                              {isGeneratingSubject ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Generating...
                                </>
                              ) : (
                                "Generate Subject Now"
                              )}
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Subject description form for Design Myself */}
                    {selectedSubjectOption === "design-myself" && (
                      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="text-center mb-8">
                          <h2 className="text-2xl font-semibold text-muted-foreground mb-4">Describe your subject</h2>
                        </div>

                        <div className="max-w-lg mx-auto">
                          <Textarea
                            value={subjectDescription}
                            onChange={(e) => setSubjectDescription(e.target.value)}
                            placeholder="Describe what you want as the subject of your image..."
                            className="min-h-[150px] text-center border-2 border-border bg-card hover:bg-accent/50 transition-colors p-6 text-base font-medium rounded-lg resize-none"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {currentStep === 4 && (
          <>
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold mb-4 text-[#0db0de]">What dimensions do you want your image to be?</h1>
              <p className="text-xl text-muted-foreground">Choose the aspect ratio for your image</p>
            </div>

            {/* Show dimension selection grid when no dimension is selected */}
            {!selectedDimension ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 justify-items-center max-w-4xl mx-auto">
                {dimensionOptions.map(dimension => (
                  <Card 
                    key={dimension.id}
                    className="cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1 hover:bg-accent/50 w-full max-w-md"
                    onClick={() => setSelectedDimension(dimension.id)}
                  >
                    <CardHeader className="pb-3 text-center">
                      <CardTitle className="text-lg font-semibold text-card-foreground">
                        {dimension.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-sm text-muted-foreground text-center">
                        {dimension.description}
                      </CardDescription>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              /* Show selected dimension and custom inputs if needed */
              <div className="flex flex-col items-stretch animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="mb-8 selected-card">
                  <Card className="w-full border-[#0db0de] bg-[#0db0de]/5 shadow-md">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg font-semibold text-[#0db0de] text-center flex items-center justify-center gap-2">
                        {dimensionOptions.find(d => d.id === selectedDimension)?.name}
                        <span className="text-sm">✓</span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CardDescription className="text-sm text-muted-foreground text-center">
                        {dimensionOptions.find(d => d.id === selectedDimension)?.description}
                      </CardDescription>
                      <div className="text-center mt-3">
                        <button onClick={() => {
                          setSelectedDimension(null);
                          setCustomWidth("");
                          setCustomHeight("");
                        }} className="text-xs text-primary hover:text-primary/80 underline transition-colors">
                          Change selection
                        </button>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Custom dimension inputs */}
                {selectedDimension === "custom" && (
                  <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="text-center mb-8">
                      <h2 className="text-2xl font-semibold text-muted-foreground mb-4">Enter custom dimensions</h2>
                    </div>
                    <div className="max-w-md mx-auto flex gap-4 items-center">
                      <div className="flex-1">
                        <Input
                          type="number"
                          value={customWidth}
                          onChange={(e) => setCustomWidth(e.target.value)}
                          placeholder="Width"
                          className="text-center border-2 border-border bg-card hover:bg-accent/50 transition-colors p-4 text-base font-medium rounded-lg"
                        />
                      </div>
                      <span className="text-muted-foreground">×</span>
                      <div className="flex-1">
                        <Input
                          type="number"
                          value={customHeight}
                          onChange={(e) => setCustomHeight(e.target.value)}
                          placeholder="Height"
                          className="text-center border-2 border-border bg-card hover:bg-accent/50 transition-colors p-4 text-base font-medium rounded-lg"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Bottom Navigation */}
        <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border p-4">
          <div className="max-w-6xl mx-auto flex justify-between items-center">
            <Button
              variant="outline"
              onClick={() => setCurrentStep(prev => Math.max(1, prev - 1))}
              className={currentStep === 1 ? "invisible" : ""}
              disabled={currentStep === 1}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            
            <Button
              variant={
                (currentStep === 1 && !isStep1Complete()) || 
                (currentStep === 2 && !isStep2Complete()) ||
                (currentStep === 3 && !isStep3Complete()) ||
                (currentStep === 4 && !isStep4Complete()) ? "outline" : "brand"
              }
              onClick={() => {
                if (currentStep === 4 && isStep4Complete()) {
                  // TODO: Generate the image/viibe
                  console.log("Generate VIIBE!");
                } else {
                  setCurrentStep(prev => prev + 1);
                }
              }}
              disabled={
                (currentStep === 1 && !isStep1Complete()) || 
                (currentStep === 2 && !isStep2Complete()) ||
                (currentStep === 3 && !isStep3Complete()) ||
                (currentStep === 4 && !isStep4Complete())
              }
            >
              {currentStep === 4 && isStep4Complete() ? (
                "GENERATE VIIBE"
              ) : (
                <>
                  Continue
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>

        {/* API Key Dialog */}
        <ApiKeyDialog 
          open={showApiKeyDialog}
          onOpenChange={setShowApiKeyDialog}
          onApiKeySet={handleApiKeySet}
        />

      </div>
    </div>;
};
export default Index;