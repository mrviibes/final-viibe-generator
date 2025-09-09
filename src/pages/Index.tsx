import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Search, Loader2, AlertCircle, ArrowLeft, ArrowRight, X, Download } from "lucide-react";
import { openAIService, OpenAISearchResult } from "@/lib/openai";
import { ApiKeyDialog } from "@/components/ApiKeyDialog";
import { IdeogramKeyDialog } from "@/components/IdeogramKeyDialog";
import { ProxySettingsDialog } from "@/components/ProxySettingsDialog";
import { CorsRetryDialog } from "@/components/CorsRetryDialog";
import { StepProgress } from "@/components/StepProgress";
import { StackedSelectionCard } from "@/components/StackedSelectionCard";
import { TextLayoutSelector } from "@/components/TextLayoutSelector";
import { useNavigate } from "react-router-dom";
import { buildIdeogramHandoff } from "@/lib/ideogram";
import { createSession, generateTextOptions, generateVisualOptions, type Session, dedupe } from "@/lib/viibe_core";
import { cleanForDisplay } from "@/lib/visualModel";
import { generateIdeogramImage, setIdeogramApiKey, getIdeogramApiKey, IdeogramAPIError, getProxySettings, setProxySettings, testProxyConnection, ProxySettings } from "@/lib/ideogramApi";
import { buildIdeogramPrompt, getAspectRatioForIdeogram, getStyleTypeForIdeogram } from "@/lib/ideogramPrompt";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";
import { normalizeTypography, suggestContractions, isTextMisspelled } from "@/lib/textUtils";
import { generateStep2Lines } from "@/lib/textGen";
import { addTextOverlay, cleanupBlobUrl } from "@/lib/textOverlay";

// Layout mappings with strengthened prompt tokens for better AI understanding
const layoutMappings = {
  negativeSpace: { 
    label: "Negative Space", 
    token: "subject off-center, large empty negative space on one side, clear open area for overlay text, asymmetrical composition with prominent empty space" 
  },
  memeTopBottom: { 
    label: "Meme Top/Bottom", 
    token: "clear horizontal bands at top and bottom edges, wide letterbox format, prominent empty text areas above and below main subject" 
  },
  lowerThird: { 
    label: "Lower Third Banner", 
    token: "clear horizontal stripe across bottom third, news broadcast style, empty banner space in lower portion, subject above the lower third area" 
  },
  sideBarLeft: { 
    label: "Side Bar (Left)", 
    token: "prominent empty vertical panel on left side, clear column space for text overlay, subject positioned right of center, sidebar composition" 
  },
  badgeSticker: { 
    label: "Badge/Sticker Callout", 
    token: "clear circular or oval space in top-right corner, badge placement area, sticker zone upper right, clean corner space for callout element" 
  },
  subtleCaption: { 
    label: "Subtle Caption", 
    token: "clean narrow horizontal strip at bottom edge, minimal caption space, thin text band at lower border, subtitle area bottom" 
  }
};

const styleOptions = [
  {
    id: "celebrations",
    name: "Celebrations",
    description: "Holidays, milestones, special occasions"
  },
  {
    id: "sports",
    name: "Sports",
    description: "All sports, activities, and competitions"
  },
  {
    id: "daily-life",
    name: "Daily Life",
    description: "Everyday routines, hobbies, and situations"
  },
  {
    id: "vibes-punchlines",
    name: "Vibes & Punchlines",
    description: "Moods, self-talk, jokes, and formats"
  },
  {
    id: "pop-culture",
    name: "Pop Culture",
    description: "Movies, music, celebrities, trends"
  },
  {
    id: "random",
    name: "No Category",
    description: "Build from scratch"
  }
];

const celebrationOptions = [
  { id: "birthday", name: "Birthday" },
  { id: "christmas-day", name: "Christmas Day" },
  { id: "thanksgiving-us", name: "Thanksgiving (United States)" },
  { id: "new-years-eve", name: "New Year's Eve" },
  { id: "christmas-eve", name: "Christmas Eve" },
  { id: "halloween", name: "Halloween" },
  { id: "mothers-day", name: "Mother's Day" },
  { id: "fathers-day", name: "Father's Day" },
  { id: "independence-day-us", name: "Independence Day (United States)" },
  { id: "new-years-day", name: "New Year's Day" },
  { id: "easter", name: "Easter" },
  { id: "memorial-day-us", name: "Memorial Day (United States)" },
  { id: "valentines-day", name: "Valentine's Day" },
  { id: "wedding", name: "Wedding" },
  { id: "wedding-anniversary", name: "Wedding Anniversary" },
  { id: "high-school-graduation", name: "High School Graduation" },
  { id: "college-graduation", name: "College Graduation" },
  { id: "baby-shower", name: "Baby Shower" },
  { id: "bridal-shower", name: "Bridal Shower" },
  { id: "bachelor-party", name: "Bachelor Party" },
  { id: "bachelorette-party", name: "Bachelorette Party" },
  { id: "engagement-party", name: "Engagement Party" },
  { id: "housewarming-party", name: "Housewarming Party" },
  { id: "retirement-party", name: "Retirement Party" },
  { id: "job-promotion-celebration", name: "Job Promotion Celebration" },
  { id: "farewell-party", name: "Farewell Party (Going Away Party)" },
  { id: "babys-first-birthday", name: "Baby's First Birthday" },
  { id: "sweet-16-birthday", name: "Sweet 16 Birthday" },
  { id: "quinceanera", name: "Quinceañera" },
  { id: "bar-mitzvah", name: "Bar Mitzvah" },
  { id: "bat-mitzvah", name: "Bat Mitzvah" },
  { id: "gender-reveal-party", name: "Gender Reveal Party" },
  { id: "christening-baptism", name: "Christening / Baptism" },
  { id: "first-communion", name: "First Communion" },
  { id: "confirmation", name: "Confirmation" },
  { id: "hanukkah", name: "Hanukkah" },
  { id: "kwanzaa", name: "Kwanzaa" },
  { id: "diwali", name: "Diwali (Deepavali)" },
  { id: "chinese-new-year", name: "Chinese New Year (Lunar New Year)" },
  { id: "saint-patricks-day", name: "Saint Patrick's Day" },
  { id: "labor-day", name: "Labor Day" },
  { id: "veterans-day-us", name: "Veterans Day (United States)" },
  { id: "martin-luther-king-jr-day", name: "Martin Luther King Jr. Day" },
  { id: "juneteenth", name: "Juneteenth" },
  { id: "cinco-de-mayo", name: "Cinco de Mayo" },
  { id: "mardi-gras", name: "Mardi Gras" },
  { id: "good-friday", name: "Good Friday" },
  { id: "passover", name: "Passover" },
  { id: "eid-al-fitr", name: "Eid al-Fitr" },
  { id: "eid-al-adha", name: "Eid al-Adha" },
  { id: "nowruz", name: "Nowruz (Persian New Year)" },
  { id: "purim", name: "Purim" },
  { id: "rosh-hashanah", name: "Rosh Hashanah" },
  { id: "holi", name: "Holi" },
  { id: "navratri", name: "Navratri" },
  { id: "durga-puja", name: "Durga Puja" },
  { id: "lohri", name: "Lohri" },
  { id: "vaisakhi", name: "Vaisakhi (Baisakhi)" },
  { id: "onam", name: "Onam" },
  { id: "raksha-bandhan", name: "Raksha Bandhan" },
  { id: "janmashtami", name: "Janmashtami" },
  { id: "ganesh-chaturthi", name: "Ganesh Chaturthi" },
  { id: "guru-nanak-gurpurab", name: "Guru Nanak Gurpurab" },
  { id: "pride", name: "Pride (LGBTQ+ Pride events)" },
  { id: "earth-day", name: "Earth Day" },
  { id: "groundhog-day", name: "Groundhog Day" },
  { id: "super-bowl-sunday", name: "Super Bowl Sunday" },
  { id: "boxing-day", name: "Boxing Day" },
  { id: "canada-day", name: "Canada Day" },
  { id: "victoria-day-canada", name: "Victoria Day (Canada)" },
  { id: "saint-jean-baptiste-day", name: "Saint-Jean-Baptiste Day (Quebec)" },
  { id: "remembrance-day-canada", name: "Remembrance Day (Canada)" },
  { id: "columbus-day", name: "Columbus Day / Indigenous Peoples' Day (U.S.)" },
  { id: "international-womens-day", name: "International Women's Day" },
  { id: "international-mens-day", name: "International Men's Day" },
  { id: "international-friendship-day", name: "International Friendship Day" }
];

const sportsOptions = [
  { id: "football-american", name: "Football (American)" },
  { id: "football-soccer", name: "Football (Soccer)" },
  { id: "basketball", name: "Basketball" },
  { id: "baseball", name: "Baseball" },
  { id: "tennis", name: "Tennis" },
  { id: "golf", name: "Golf" },
  { id: "hockey-ice", name: "Hockey (Ice)" },
  { id: "hockey-field", name: "Hockey (Field)" },
  { id: "volleyball", name: "Volleyball" },
  { id: "swimming", name: "Swimming" },
  { id: "running", name: "Running" },
  { id: "cycling", name: "Cycling" },
  { id: "boxing", name: "Boxing" },
  { id: "wrestling", name: "Wrestling" },
  { id: "martial-arts", name: "Martial Arts" },
  { id: "gymnastics", name: "Gymnastics" },
  { id: "track-and-field", name: "Track and Field" },
  { id: "skiing", name: "Skiing" },
  { id: "snowboarding", name: "Snowboarding" },
  { id: "surfing", name: "Surfing" },
  { id: "skateboarding", name: "Skateboarding" },
  { id: "rock-climbing", name: "Rock Climbing" },
  { id: "fishing", name: "Fishing" },
  { id: "hunting", name: "Hunting" },
  { id: "hiking", name: "Hiking" },
  { id: "camping", name: "Camping" },
  { id: "yoga", name: "Yoga" },
  { id: "pilates", name: "Pilates" },
  { id: "crossfit", name: "CrossFit" },
  { id: "weightlifting", name: "Weightlifting" },
  { id: "powerlifting", name: "Powerlifting" },
  { id: "bodybuilding", name: "Bodybuilding" },
  { id: "cheerleading", name: "Cheerleading" },
  { id: "dance-sport", name: "Dance (Sport)" },
  { id: "equestrian", name: "Equestrian" },
  { id: "bowling", name: "Bowling" },
  { id: "billiards-pool", name: "Billiards / Pool" },
  { id: "darts", name: "Darts" },
  { id: "ping-pong", name: "Ping Pong (Table Tennis)" },
  { id: "badminton", name: "Badminton" },
  { id: "squash", name: "Squash" },
  { id: "racquetball", name: "Racquetball" },
  { id: "lacrosse", name: "Lacrosse" },
  { id: "rugby", name: "Rugby" },
  { id: "cricket", name: "Cricket" },
  { id: "archery", name: "Archery" },
  { id: "fencing", name: "Fencing" },
  { id: "sailing", name: "Sailing" },
  { id: "rowing", name: "Rowing" },
  { id: "kayaking", name: "Kayaking" },
  { id: "canoeing", name: "Canoeing" },
  { id: "water-skiing", name: "Water Skiing" },
  { id: "wakeboarding", name: "Wakeboarding" },
  { id: "jet-skiing", name: "Jet Skiing" },
  { id: "scuba-diving", name: "Scuba Diving" },
  { id: "snorkeling", name: "Snorkeling" },
  { id: "triathlon", name: "Triathlon" },
  { id: "marathon", name: "Marathon" },
  { id: "half-marathon", name: "Half Marathon" },
  { id: "obstacle-racing", name: "Obstacle Racing" },
  { id: "mud-run", name: "Mud Run" },
  { id: "esports", name: "Esports" },
  { id: "chess", name: "Chess" },
  { id: "poker", name: "Poker" },
  { id: "auto-racing", name: "Auto Racing" },
  { id: "motorcycle-racing", name: "Motorcycle Racing" },
  { id: "bmx", name: "BMX" },
  { id: "mountain-biking", name: "Mountain Biking" },
  { id: "road-cycling", name: "Road Cycling" },
  { id: "ultimate-frisbee", name: "Ultimate Frisbee" },
  { id: "disc-golf", name: "Disc Golf" },
  { id: "parkour", name: "Parkour" },
  { id: "bouldering", name: "Bouldering" },
  { id: "ice-skating", name: "Ice Skating" },
  { id: "roller-skating", name: "Roller Skating" },
  { id: "inline-skating", name: "Inline Skating" },
  { id: "figure-skating", name: "Figure Skating" },
  { id: "speed-skating", name: "Speed Skating" },
  { id: "curling", name: "Curling" },
  { id: "sledding", name: "Sledding" },
  { id: "bobsledding", name: "Bobsledding" },
  { id: "luge", name: "Luge" },
  { id: "skeleton", name: "Skeleton" },
  { id: "biathlon", name: "Biathlon" },
  { id: "cross-country-skiing", name: "Cross-Country Skiing" },
  { id: "alpine-skiing", name: "Alpine Skiing" },
  { id: "freestyle-skiing", name: "Freestyle Skiing" },
  { id: "ski-jumping", name: "Ski Jumping" },
  { id: "nordic-combined", name: "Nordic Combined" },
  { id: "snowshoeing", name: "Snowshoeing" },
  { id: "ice-climbing", name: "Ice Climbing" },
  { id: "mountaineering", name: "Mountaineering" },
  { id: "base-jumping", name: "Base Jumping" },
  { id: "skydiving", name: "Skydiving" },
  { id: "paragliding", name: "Paragliding" },
  { id: "hang-gliding", name: "Hang Gliding" },
  { id: "hot-air-ballooning", name: "Hot Air Ballooning" },
  { id: "bungee-jumping", name: "Bungee Jumping" },
  { id: "ziplining", name: "Ziplining" },
  { id: "kite-surfing", name: "Kite Surfing" },
  { id: "windsurfing", name: "Windsurfing" },
  { id: "stand-up-paddleboarding", name: "Stand-Up Paddleboarding" },
  { id: "white-water-rafting", name: "White Water Rafting" },
  { id: "canyoning", name: "Canyoning" },
  { id: "spelunking", name: "Spelunking" },
  { id: "orienteering", name: "Orienteering" },
  { id: "geocaching", name: "Geocaching" },
  { id: "backpacking", name: "Backpacking" },
  { id: "wilderness-survival", name: "Wilderness Survival" },
  { id: "paintball", name: "Paintball" },
  { id: "laser-tag", name: "Laser Tag" },
  { id: "airsoft", name: "Airsoft" },
  { id: "competitive-shooting", name: "Competitive Shooting" }
];

const dailyLifeOptions = [
  { id: "work", name: "Work" },
  { id: "school", name: "School" },
  { id: "commuting", name: "Commuting" },
  { id: "cooking", name: "Cooking" },
  { id: "cleaning", name: "Cleaning" },
  { id: "shopping", name: "Shopping" },
  { id: "parenting", name: "Parenting" },
  { id: "pets", name: "Pets" },
  { id: "gardening", name: "Gardening" },
  { id: "home-improvement", name: "Home Improvement" },
  { id: "technology", name: "Technology" },
  { id: "driving", name: "Driving" },
  { id: "public-transportation", name: "Public Transportation" },
  { id: "weather", name: "Weather" },
  { id: "health-fitness", name: "Health & Fitness" },
  { id: "medical-appointments", name: "Medical Appointments" },
  { id: "finances", name: "Finances" },
  { id: "bills", name: "Bills" },
  { id: "taxes", name: "Taxes" },
  { id: "insurance", name: "Insurance" },
  { id: "legal-matters", name: "Legal Matters" },
  { id: "moving-relocating", name: "Moving / Relocating" },
  { id: "travel", name: "Travel" },
  { id: "vacation", name: "Vacation" },
  { id: "hotel-stays", name: "Hotel Stays" },
  { id: "airports", name: "Airports" },
  { id: "flight-delays", name: "Flight Delays" },
  { id: "road-trips", name: "Road Trips" },
  { id: "restaurants", name: "Restaurants" },
  { id: "fast-food", name: "Fast Food" },
  { id: "coffee-shops", name: "Coffee Shops" },
  { id: "bars-nightlife", name: "Bars & Nightlife" },
  { id: "dating", name: "Dating" },
  { id: "relationships", name: "Relationships" },
  { id: "marriage", name: "Marriage" },
  { id: "friendship", name: "Friendship" },
  { id: "family", name: "Family" },
  { id: "social-media", name: "Social Media" },
  { id: "online-shopping", name: "Online Shopping" },
  { id: "streaming-services", name: "Streaming Services" },
  { id: "video-games", name: "Video Games" },
  { id: "board-games", name: "Board Games" },
  { id: "puzzles", name: "Puzzles" },
  { id: "reading", name: "Reading" },
  { id: "writing", name: "Writing" },
  { id: "journaling", name: "Journaling" },
  { id: "blogging", name: "Blogging" },
  { id: "photography", name: "Photography" },
  { id: "art-drawing", name: "Art & Drawing" },
  { id: "crafts", name: "Crafts" },
  { id: "sewing", name: "Sewing" },
  { id: "knitting", name: "Knitting" },
  { id: "woodworking", name: "Woodworking" },
  { id: "car-maintenance", name: "Car Maintenance" },
  { id: "diy-projects", name: "DIY Projects" },
  { id: "music-listening", name: "Music (Listening)" },
  { id: "music-playing", name: "Music (Playing)" },
  { id: "singing", name: "Singing" },
  { id: "dancing", name: "Dancing" },
  { id: "theater", name: "Theater" },
  { id: "concerts", name: "Concerts" },
  { id: "festivals", name: "Festivals" },
  { id: "museums", name: "Museums" },
  { id: "art-galleries", name: "Art Galleries" },
  { id: "libraries", name: "Libraries" },
  { id: "bookstores", name: "Bookstores" },
  { id: "volunteering", name: "Volunteering" },
  { id: "charity-work", name: "Charity Work" },
  { id: "community-service", name: "Community Service" },
  { id: "religious-activities", name: "Religious Activities" },
  { id: "meditation", name: "Meditation" },
  { id: "mindfulness", name: "Mindfulness" },
  { id: "self-care", name: "Self-Care" },
  { id: "therapy", name: "Therapy" },
  { id: "support-groups", name: "Support Groups" },
  { id: "learning-new-skills", name: "Learning New Skills" },
  { id: "online-courses", name: "Online Courses" },
  { id: "language-learning", name: "Language Learning" },
  { id: "professional-development", name: "Professional Development" },
  { id: "networking", name: "Networking" },
  { id: "job-searching", name: "Job Searching" },
  { id: "interviews", name: "Interviews" },
  { id: "retirement", name: "Retirement" },
  { id: "aging", name: "Aging" },
  { id: "empty-nest", name: "Empty Nest" },
  { id: "midlife-crisis", name: "Midlife Crisis" },
  { id: "quarter-life-crisis", name: "Quarter-Life Crisis" },
  { id: "procrastination", name: "Procrastination" },
  { id: "productivity", name: "Productivity" },
  { id: "time-management", name: "Time Management" },
  { id: "stress", name: "Stress" },
  { id: "anxiety", name: "Anxiety" },
  { id: "depression", name: "Depression" },
  { id: "burnout", name: "Burnout" },
  { id: "sleep", name: "Sleep" },
  { id: "insomnia", name: "Insomnia" },
  { id: "dreams", name: "Dreams" },
  { id: "nightmares", name: "Nightmares" },
  { id: "morning-routine", name: "Morning Routine" },
  { id: "evening-routine", name: "Evening Routine" },
  { id: "bedtime-routine", name: "Bedtime Routine" },
  { id: "weekend-plans", name: "Weekend Plans" },
  { id: "lazy-days", name: "Lazy Days" },
  { id: "busy-days", name: "Busy Days" },
  { id: "unexpected-events", name: "Unexpected Events" },
  { id: "emergencies", name: "Emergencies" },
  { id: "power-outages", name: "Power Outages" },
  { id: "internet-outages", name: "Internet Outages" },
  { id: "traffic-jams", name: "Traffic Jams" },
  { id: "construction", name: "Construction" },
  { id: "noise-complaints", name: "Noise Complaints" },
  { id: "neighbors", name: "Neighbors" },
  { id: "apartment-living", name: "Apartment Living" },
  { id: "house-ownership", name: "House Ownership" },
  { id: "renting", name: "Renting" },
  { id: "roommates", name: "Roommates" },
  { id: "living-alone", name: "Living Alone" },
  { id: "privacy", name: "Privacy" },
  { id: "personal-space", name: "Personal Space" },
  { id: "clutter", name: "Clutter" },
  { id: "organization", name: "Organization" },
  { id: "storage", name: "Storage" },
  { id: "minimalism", name: "Minimalism" }
];

const vibesPunchlinesOptions = [
  { id: "funny-jokes", name: "Funny Jokes" },
  { id: "puns-wordplay", name: "Puns & Wordplay" },
  { id: "dad-jokes", name: "Dad Jokes" },
  { id: "mom-jokes", name: "Mom Jokes" },
  { id: "self-deprecating-humor", name: "Self-Deprecating Humor" },
  { id: "observational-comedy", name: "Observational Comedy" },
  { id: "situational-comedy", name: "Situational Comedy" },
  { id: "irony-sarcasm", name: "Irony & Sarcasm" },
  { id: "witty-one-liners", name: "Witty One-Liners" },
  { id: "comeback-lines", name: "Comeback Lines" },
  { id: "roasts-burns", name: "Roasts & Burns" },
  { id: "awkward-moments", name: "Awkward Moments" },
  { id: "embarrassing-situations", name: "Embarrassing Situations" },
  { id: "fails-mishaps", name: "Fails & Mishaps" },
  { id: "clumsy-moments", name: "Clumsy Moments" },
  { id: "brain-farts", name: "Brain Farts" },
  { id: "procrastination-humor", name: "Procrastination Humor" },
  { id: "lazy-vibes", name: "Lazy Vibes" },
  { id: "motivational-humor", name: "Motivational Humor" },
  { id: "inspirational-quotes", name: "Inspirational Quotes" },
  { id: "life-advice", name: "Life Advice" },
  { id: "wisdom-humor", name: "Wisdom & Humor" },
  { id: "philosophical-thoughts", name: "Philosophical Thoughts" },
  { id: "existential-crisis", name: "Existential Crisis" },
  { id: "deep-thoughts", name: "Deep Thoughts" },
  { id: "shower-thoughts", name: "Shower Thoughts" },
  { id: "random-thoughts", name: "Random Thoughts" },
  { id: "weird-observations", name: "Weird Observations" },
  { id: "life-realizations", name: "Life Realizations" },
  { id: "adulting-struggles", name: "Adulting Struggles" },
  { id: "growing-up", name: "Growing Up" },
  { id: "nostalgia", name: "Nostalgia" },
  { id: "childhood-memories", name: "Childhood Memories" },
  { id: "teenage-years", name: "Teenage Years" },
  { id: "college-days", name: "College Days" },
  { id: "first-job", name: "First Job" },
  { id: "work-humor", name: "Work Humor" },
  { id: "office-life", name: "Office Life" },
  { id: "boss-jokes", name: "Boss Jokes" },
  { id: "coworker-humor", name: "Coworker Humor" },
  { id: "meeting-humor", name: "Meeting Humor" },
  { id: "email-humor", name: "Email Humor" },
  { id: "monday-blues", name: "Monday Blues" },
  { id: "friday-feeling", name: "Friday Feeling" },
  { id: "weekend-vibes", name: "Weekend Vibes" },
  { id: "vacation-mode", name: "Vacation Mode" },
  { id: "holiday-stress", name: "Holiday Stress" },
  { id: "family-gatherings", name: "Family Gatherings" },
  { id: "relationship-humor", name: "Relationship Humor" },
  { id: "dating-fails", name: "Dating Fails" },
  { id: "marriage-jokes", name: "Marriage Jokes" },
  { id: "parenting-humor", name: "Parenting Humor" },
  { id: "kid-logic", name: "Kid Logic" },
  { id: "pet-humor", name: "Pet Humor" },
  { id: "animal-behavior", name: "Animal Behavior" },
  { id: "food-humor", name: "Food Humor" },
  { id: "cooking-fails", name: "Cooking Fails" },
  { id: "diet-struggles", name: "Diet Struggles" },
  { id: "exercise-humor", name: "Exercise Humor" },
  { id: "gym-life", name: "Gym Life" },
  { id: "health-humor", name: "Health Humor" },
  { id: "getting-older", name: "Getting Older" },
  { id: "technology-humor", name: "Technology Humor" },
  { id: "internet-culture", name: "Internet Culture" },
  { id: "social-media-humor", name: "Social Media Humor" },
  { id: "phone-addiction", name: "Phone Addiction" },
  { id: "wifi-problems", name: "WiFi Problems" },
  { id: "tech-support", name: "Tech Support" },
  { id: "online-shopping", name: "Online Shopping" },
  { id: "delivery-humor", name: "Delivery Humor" },
  { id: "customer-service", name: "Customer Service" },
  { id: "retail-therapy", name: "Retail Therapy" },
  { id: "money-humor", name: "Money Humor" },
  { id: "broke-life", name: "Broke Life" },
  { id: "student-loans", name: "Student Loans" },
  { id: "taxes-humor", name: "Taxes Humor" },
  { id: "bank-account", name: "Bank Account" },
  { id: "credit-cards", name: "Credit Cards" },
  { id: "investing-humor", name: "Investing Humor" },
  { id: "retirement-planning", name: "Retirement Planning" },
  { id: "travel-humor", name: "Travel Humor" },
  { id: "airport-experiences", name: "Airport Experiences" },
  { id: "flight-delays", name: "Flight Delays" },
  { id: "hotel-stays", name: "Hotel Stays" },
  { id: "road-trip-humor", name: "Road Trip Humor" },
  { id: "navigation-fails", name: "Navigation Fails" },
  { id: "weather-humor", name: "Weather Humor" },
  { id: "seasonal-changes", name: "Seasonal Changes" },
  { id: "weather-predictions", name: "Weather Predictions" },
  { id: "climate-humor", name: "Climate Humor" },
  { id: "driving-humor", name: "Driving Humor" },
  { id: "traffic-jams", name: "Traffic Jams" },
  { id: "parking-struggles", name: "Parking Struggles" },
  { id: "gas-prices", name: "Gas Prices" },
  { id: "car-maintenance", name: "Car Maintenance" },
  { id: "public-transport", name: "Public Transport" },
  { id: "commuting-humor", name: "Commuting Humor" },
  { id: "home-improvement", name: "Home Improvement" },
  { id: "diy-fails", name: "DIY Fails" },
  { id: "furniture-assembly", name: "Furniture Assembly" },
  { id: "cleaning-humor", name: "Cleaning Humor" },
  { id: "laundry-struggles", name: "Laundry Struggles" },
  { id: "organization-fails", name: "Organization Fails" },
  { id: "storage-solutions", name: "Storage Solutions" },
  { id: "decluttering", name: "Decluttering" },
  { id: "minimalism-humor", name: "Minimalism Humor" },
  { id: "hoarding-tendencies", name: "Hoarding Tendencies" },
  { id: "shopping-addiction", name: "Shopping Addiction" },
  { id: "impulse-buying", name: "Impulse Buying" },
  { id: "buyer-remorse", name: "Buyer's Remorse" }
];

const popCultureOptions = [
  { id: "movies", name: "Movies" },
  { id: "tv-shows", name: "TV Shows" },
  { id: "netflix", name: "Netflix" },
  { id: "streaming-services", name: "Streaming Services" },
  { id: "binge-watching", name: "Binge Watching" },
  { id: "series-finales", name: "Series Finales" },
  { id: "cliffhangers", name: "Cliffhangers" },
  { id: "plot-twists", name: "Plot Twists" },
  { id: "spoilers", name: "Spoilers" },
  { id: "movie-theaters", name: "Movie Theaters" },
  { id: "popcorn", name: "Popcorn" },
  { id: "3d-movies", name: "3D Movies" },
  { id: "imax", name: "IMAX" },
  { id: "drive-in-theaters", name: "Drive-In Theaters" },
  { id: "horror-movies", name: "Horror Movies" },
  { id: "comedy-movies", name: "Comedy Movies" },
  { id: "action-movies", name: "Action Movies" },
  { id: "romantic-comedies", name: "Romantic Comedies" },
  { id: "sci-fi-movies", name: "Sci-Fi Movies" },
  { id: "fantasy-movies", name: "Fantasy Movies" },
  { id: "superhero-movies", name: "Superhero Movies" },
  { id: "marvel", name: "Marvel" },
  { id: "dc-comics", name: "DC Comics" },
  { id: "disney", name: "Disney" },
  { id: "pixar", name: "Pixar" },
  { id: "animated-movies", name: "Animated Movies" },
  { id: "documentaries", name: "Documentaries" },
  { id: "true-crime", name: "True Crime" },
  { id: "reality-tv", name: "Reality TV" },
  { id: "talent-shows", name: "Talent Shows" },
  { id: "cooking-shows", name: "Cooking Shows" },
  { id: "home-renovation", name: "Home Renovation Shows" },
  { id: "dating-shows", name: "Dating Shows" },
  { id: "game-shows", name: "Game Shows" },
  { id: "talk-shows", name: "Talk Shows" },
  { id: "late-night-tv", name: "Late Night TV" },
  { id: "sitcoms", name: "Sitcoms" },
  { id: "dramas", name: "Dramas" },
  { id: "soap-operas", name: "Soap Operas" },
  { id: "news-programs", name: "News Programs" },
  { id: "sports-broadcasts", name: "Sports Broadcasts" },
  { id: "award-shows", name: "Award Shows" },
  { id: "oscars", name: "Oscars" },
  { id: "emmys", name: "Emmys" },
  { id: "golden-globes", name: "Golden Globes" },
  { id: "grammys", name: "Grammys" },
  { id: "music", name: "Music" },
  { id: "concerts", name: "Concerts" },
  { id: "music-festivals", name: "Music Festivals" },
  { id: "albums", name: "Albums" },
  { id: "singles", name: "Singles" },
  { id: "music-videos", name: "Music Videos" },
  { id: "mtv", name: "MTV" },
  { id: "radio", name: "Radio" },
  { id: "podcasts", name: "Podcasts" },
  { id: "spotify", name: "Spotify" },
  { id: "apple-music", name: "Apple Music" },
  { id: "youtube", name: "YouTube" },
  { id: "tiktok", name: "TikTok" },
  { id: "instagram", name: "Instagram" },
  { id: "facebook", name: "Facebook" },
  { id: "twitter", name: "Twitter" },
  { id: "snapchat", name: "Snapchat" },
  { id: "social-media", name: "Social Media" },
  { id: "influencers", name: "Influencers" },
  { id: "youtubers", name: "YouTubers" },
  { id: "content-creators", name: "Content Creators" },
  { id: "viral-videos", name: "Viral Videos" },
  { id: "memes", name: "Memes" },
  { id: "internet-culture", name: "Internet Culture" },
  { id: "online-trends", name: "Online Trends" },
  { id: "hashtags", name: "Hashtags" },
  { id: "going-viral", name: "Going Viral" },
  { id: "cancel-culture", name: "Cancel Culture" },
  { id: "celebrities", name: "Celebrities" },
  { id: "celebrity-gossip", name: "Celebrity Gossip" },
  { id: "paparazzi", name: "Paparazzi" },
  { id: "red-carpet", name: "Red Carpet" },
  { id: "fashion", name: "Fashion" },
  { id: "fashion-week", name: "Fashion Week" },
  { id: "designer-brands", name: "Designer Brands" },
  { id: "fast-fashion", name: "Fast Fashion" },
  { id: "beauty-trends", name: "Beauty Trends" },
  { id: "makeup", name: "Makeup" },
  { id: "skincare", name: "Skincare" },
  { id: "hair-trends", name: "Hair Trends" },
  { id: "nail-art", name: "Nail Art" },
  { id: "fitness-trends", name: "Fitness Trends" },
  { id: "diet-fads", name: "Diet Fads" },
  { id: "wellness", name: "Wellness" },
  { id: "self-care", name: "Self-Care" },
  { id: "mental-health", name: "Mental Health" },
  { id: "therapy", name: "Therapy" },
  { id: "mindfulness", name: "Mindfulness" },
  { id: "meditation", name: "Meditation" },
  { id: "yoga", name: "Yoga" },
  { id: "crystals", name: "Crystals" },
  { id: "astrology", name: "Astrology" },
  { id: "horoscopes", name: "Horoscopes" },
  { id: "tarot", name: "Tarot" },
  { id: "spiritual-trends", name: "Spiritual Trends" },
  { id: "conspiracy-theories", name: "Conspiracy Theories" },
  { id: "urban-legends", name: "Urban Legends" },
  { id: "myths", name: "Myths" },
  { id: "folklore", name: "Folklore" },
  { id: "ghost-stories", name: "Ghost Stories" },
  { id: "paranormal", name: "Paranormal" },
  { id: "aliens", name: "Aliens" },
  { id: "ufo-sightings", name: "UFO Sightings" },
  { id: "science-fiction", name: "Science Fiction" },
  { id: "space-exploration", name: "Space Exploration" },
  { id: "nasa", name: "NASA" },
  { id: "mars-missions", name: "Mars Missions" },
  { id: "space-x", name: "SpaceX" },
  { id: "elon-musk", name: "Elon Musk" },
  { id: "tesla", name: "Tesla" },
  { id: "electric-cars", name: "Electric Cars" },
  { id: "self-driving-cars", name: "Self-Driving Cars" },
  { id: "artificial-intelligence", name: "Artificial Intelligence" },
  { id: "chatgpt", name: "ChatGPT" },
  { id: "robots", name: "Robots" },
  { id: "automation", name: "Automation" },
  { id: "technology-trends", name: "Technology Trends" },
  { id: "smartphones", name: "Smartphones" },
  { id: "iphone", name: "iPhone" },
  { id: "android", name: "Android" },
  { id: "apps", name: "Apps" },
  { id: "mobile-games", name: "Mobile Games" },
  { id: "video-games", name: "Video Games" },
  { id: "gaming", name: "Gaming" },
  { id: "esports", name: "Esports" },
  { id: "twitch", name: "Twitch" },
  { id: "streaming", name: "Streaming" },
  { id: "online-gaming", name: "Online Gaming" },
  { id: "virtual-reality", name: "Virtual Reality" },
  { id: "augmented-reality", name: "Augmented Reality" },
  { id: "metaverse", name: "Metaverse" },
  { id: "nfts", name: "NFTs" },
  { id: "cryptocurrency", name: "Cryptocurrency" },
  { id: "bitcoin", name: "Bitcoin" },
  { id: "blockchain", name: "Blockchain" },
  { id: "stocks", name: "Stocks" },
  { id: "investing", name: "Investing" },
  { id: "gamestop", name: "GameStop" },
  { id: "wallstreetbets", name: "WallStreetBets" },
  { id: "reddit", name: "Reddit" },
  { id: "discord", name: "Discord" },
  { id: "online-communities", name: "Online Communities" },
  { id: "forums", name: "Forums" },
  { id: "comment-sections", name: "Comment Sections" },
  { id: "trolling", name: "Trolling" },
  { id: "cyberbullying", name: "Cyberbullying" },
  { id: "online-safety", name: "Online Safety" },
  { id: "privacy", name: "Privacy" },
  { id: "data-protection", name: "Data Protection" },
  { id: "surveillance", name: "Surveillance" },
  { id: "government", name: "Government" },
  { id: "politics", name: "Politics" },
  { id: "elections", name: "Elections" },
  { id: "voting", name: "Voting" },
  { id: "democracy", name: "Democracy" },
  { id: "protests", name: "Protests" },
  { id: "activism", name: "Activism" },
  { id: "social-justice", name: "Social Justice" },
  { id: "human-rights", name: "Human Rights" },
  { id: "equality", name: "Equality" },
  { id: "diversity", name: "Diversity" },
  { id: "inclusion", name: "Inclusion" },
  { id: "representation", name: "Representation" },
  { id: "lgbtq", name: "LGBTQ+" },
  { id: "pride-month", name: "Pride Month" },
  { id: "black-lives-matter", name: "Black Lives Matter" },
  { id: "feminism", name: "Feminism" },
  { id: "me-too", name: "Me Too" },
  { id: "body-positivity", name: "Body Positivity" },
  { id: "mental-health-awareness", name: "Mental Health Awareness" },
  { id: "climate-change", name: "Climate Change" },
  { id: "environmental-issues", name: "Environmental Issues" },
  { id: "sustainability", name: "Sustainability" },
  { id: "recycling", name: "Recycling" },
  { id: "green-energy", name: "Green Energy" },
  { id: "electric-vehicles", name: "Electric Vehicles" },
  { id: "renewable-energy", name: "Renewable Energy" },
  { id: "solar-power", name: "Solar Power" },
  { id: "wind-power", name: "Wind Power" },
  { id: "global-warming", name: "Global Warming" },
  { id: "weather-patterns", name: "Weather Patterns" },
  { id: "natural-disasters", name: "Natural Disasters" },
  { id: "pandemics", name: "Pandemics" },
  { id: "covid-19", name: "COVID-19" },
  { id: "vaccines", name: "Vaccines" },
  { id: "masks", name: "Masks" },
  { id: "social-distancing", name: "Social Distancing" },
  { id: "lockdowns", name: "Lockdowns" },
  { id: "remote-work", name: "Remote Work" },
  { id: "work-from-home", name: "Work From Home" },
  { id: "zoom-calls", name: "Zoom Calls" },
  { id: "video-conferencing", name: "Video Conferencing" },
  { id: "online-meetings", name: "Online Meetings" },
  { id: "hybrid-work", name: "Hybrid Work" },
  { id: "digital-nomads", name: "Digital Nomads" },
  { id: "freelancing", name: "Freelancing" },
  { id: "gig-economy", name: "Gig Economy" },
  { id: "side-hustles", name: "Side Hustles" },
  { id: "entrepreneurship", name: "Entrepreneurship" },
  { id: "startups", name: "Startups" },
  { id: "tech-companies", name: "Tech Companies" },
  { id: "silicon-valley", name: "Silicon Valley" },
  { id: "venture-capital", name: "Venture Capital" },
  { id: "ipo", name: "IPO" },
  { id: "stock-market", name: "Stock Market" },
  { id: "economy", name: "Economy" },
  { id: "inflation", name: "Inflation" },
  { id: "recession", name: "Recession" },
  { id: "unemployment", name: "Unemployment" },
  { id: "job-market", name: "Job Market" },
  { id: "career-change", name: "Career Change" },
  { id: "retirement", name: "Retirement" },
  { id: "student-loans", name: "Student Loans" },
  { id: "education", name: "Education" },
  { id: "online-learning", name: "Online Learning" },
  { id: "homeschooling", name: "Homeschooling" },
  { id: "college-costs", name: "College Costs" },
  { id: "student-debt", name: "Student Debt" },
  { id: "trade-schools", name: "Trade Schools" },
  { id: "vocational-training", name: "Vocational Training" },
  { id: "skill-development", name: "Skill Development" },
  { id: "lifelong-learning", name: "Lifelong Learning" },
  { id: "personal-growth", name: "Personal Growth" },
  { id: "self-improvement", name: "Self-Improvement" },
  { id: "productivity", name: "Productivity" },
  { id: "time-management", name: "Time Management" },
  { id: "goal-setting", name: "Goal Setting" },
  { id: "new-years-resolutions", name: "New Year's Resolutions" },
  { id: "habit-formation", name: "Habit Formation" },
  { id: "morning-routines", name: "Morning Routines" },
  { id: "evening-routines", name: "Evening Routines" },
  { id: "workout-routines", name: "Workout Routines" },
  { id: "meal-prep", name: "Meal Prep" },
  { id: "healthy-eating", name: "Healthy Eating" },
  { id: "intermittent-fasting", name: "Intermittent Fasting" },
  { id: "keto-diet", name: "Keto Diet" },
  { id: "plant-based-diet", name: "Plant-Based Diet" },
  { id: "veganism", name: "Veganism" },
  { id: "vegetarianism", name: "Vegetarianism" },
  { id: "food-trends", name: "Food Trends" },
  { id: "restaurant-culture", name: "Restaurant Culture" },
  { id: "food-delivery", name: "Food Delivery" },
  { id: "cooking-at-home", name: "Cooking at Home" },
  { id: "baking", name: "Baking" },
  { id: "sourdough", name: "Sourdough" },
  { id: "coffee-culture", name: "Coffee Culture" },
  { id: "craft-beer", name: "Craft Beer" },
  { id: "wine-culture", name: "Wine Culture" },
  { id: "cocktails", name: "Cocktails" },
  { id: "mixology", name: "Mixology" },
  { id: "bar-culture", name: "Bar Culture" },
  { id: "nightlife", name: "Nightlife" },
  { id: "party-culture", name: "Party Culture" },
  { id: "festival-culture", name: "Festival Culture" },
  { id: "rave-culture", name: "Rave Culture" },
  { id: "club-scene", name: "Club Scene" },
  { id: "underground-music", name: "Underground Music" },
  { id: "indie-culture", name: "Indie Culture" },
  { id: "hipster-culture", name: "Hipster Culture" },
  { id: "mainstream-vs-alternative", name: "Mainstream vs Alternative" },
  { id: "counterculture", name: "Counterculture" },
  { id: "subcultures", name: "Subcultures" },
  { id: "generational-differences", name: "Generational Differences" },
  { id: "gen-z", name: "Gen Z" },
  { id: "millennials", name: "Millennials" },
  { id: "gen-x", name: "Gen X" },
  { id: "baby-boomers", name: "Baby Boomers" },
  { id: "generation-gap", name: "Generation Gap" },
  { id: "boomer-humor", name: "Boomer Humor" },
  { id: "millennial-problems", name: "Millennial Problems" },
  { id: "gen-z-slang", name: "Gen Z Slang" },
  { id: "internet-slang", name: "Internet Slang" },
  { id: "acronyms", name: "Acronyms" },
  { id: "emojis", name: "Emojis" },
  { id: "gifs", name: "GIFs" },
  { id: "reaction-images", name: "Reaction Images" },
  { id: "meme-formats", name: "Meme Formats" },
  { id: "viral-challenges", name: "Viral Challenges" },
  { id: "internet-challenges", name: "Internet Challenges" },
  { id: "social-media-challenges", name: "Social Media Challenges" },
  { id: "dance-challenges", name: "Dance Challenges" },
  { id: "fitness-challenges", name: "Fitness Challenges" },
  { id: "food-challenges", name: "Food Challenges" },
  { id: "ice-bucket-challenge", name: "Ice Bucket Challenge" },
  { id: "mannequin-challenge", name: "Mannequin Challenge" },
  { id: "bottle-flip", name: "Bottle Flip" },
  { id: "fidget-spinners", name: "Fidget Spinners" },
  { id: "pokemon-go", name: "Pokemon Go" },
  { id: "among-us", name: "Among Us" },
  { id: "fall-guys", name: "Fall Guys" },
  { id: "fortnite", name: "Fortnite" },
  { id: "minecraft", name: "Minecraft" },
  { id: "roblox", name: "Roblox" },
  { id: "gaming-culture", name: "Gaming Culture" },
  { id: "speedrunning", name: "Speedrunning" },
  { id: "let-plays", name: "Let's Plays" },
  { id: "game-reviews", name: "Game Reviews" },
  { id: "gaming-nostalgia", name: "Gaming Nostalgia" },
  { id: "retro-gaming", name: "Retro Gaming" },
  { id: "arcade-games", name: "Arcade Games" },
  { id: "console-wars", name: "Console Wars" },
  { id: "pc-master-race", name: "PC Master Race" },
  { id: "mobile-gaming", name: "Mobile Gaming" },
  { id: "casual-gaming", name: "Casual Gaming" },
  { id: "hardcore-gaming", name: "Hardcore Gaming" },
  { id: "competitive-gaming", name: "Competitive Gaming" },
  { id: "gaming-tournaments", name: "Gaming Tournaments" },
  { id: "gaming-streamers", name: "Gaming Streamers" },
  { id: "gaming-youtubers", name: "Gaming YouTubers" },
  { id: "gaming-memes", name: "Gaming Memes" },
  { id: "npc-memes", name: "NPC Memes" },
  { id: "respawn-jokes", name: "Respawn Jokes" },
  { id: "lag-jokes", name: "Lag Jokes" },
  { id: "glitch-humor", name: "Glitch Humor" },
  { id: "easter-eggs", name: "Easter Eggs" },
  { id: "cheat-codes", name: "Cheat Codes" },
  { id: "achievements", name: "Achievements" },
  { id: "trophies", name: "Trophies" },
  { id: "unlockables", name: "Unlockables" },
  { id: "dlc", name: "DLC" },
  { id: "microtransactions", name: "Microtransactions" },
  { id: "loot-boxes", name: "Loot Boxes" },
  { id: "pay-to-win", name: "Pay-to-Win" },
  { id: "free-to-play", name: "Free-to-Play" },
  { id: "subscription-services", name: "Subscription Services" },
  { id: "game-pass", name: "Game Pass" },
  { id: "playstation-plus", name: "PlayStation Plus" },
  { id: "nintendo-switch-online", name: "Nintendo Switch Online" },
  { id: "steam", name: "Steam" },
  { id: "epic-games-store", name: "Epic Games Store" },
  { id: "gog", name: "GOG" },
  { id: "game-libraries", name: "Game Libraries" },
  { id: "backlog", name: "Backlog" },
  { id: "steam-sales", name: "Steam Sales" },
  { id: "humble-bundle", name: "Humble Bundle" },
  { id: "indie-games", name: "Indie Games" },
  { id: "aaa-games", name: "AAA Games" },
  { id: "early-access", name: "Early Access" },
  { id: "beta-testing", name: "Beta Testing" },
  { id: "game-development", name: "Game Development" },
  { id: "modding", name: "Modding" },
  { id: "game-mods", name: "Game Mods" },
  { id: "custom-content", name: "Custom Content" },
  { id: "user-generated-content", name: "User Generated Content" },
  { id: "community-creations", name: "Community Creations" },
  { id: "fan-art", name: "Fan Art" },
  { id: "fan-fiction", name: "Fan Fiction" },
  { id: "cosplay", name: "Cosplay" },
  { id: "conventions", name: "Conventions" },
  { id: "comic-con", name: "Comic-Con" },
  { id: "anime-conventions", name: "Anime Conventions" },
  { id: "anime", name: "Anime" },
  { id: "manga", name: "Manga" },
  { id: "otaku-culture", name: "Otaku Culture" },
  { id: "japanese-culture", name: "Japanese Culture" },
  { id: "k-pop", name: "K-Pop" },
  { id: "korean-culture", name: "Korean Culture" },
  { id: "hallyu", name: "Hallyu" },
  { id: "bts", name: "BTS" },
  { id: "blackpink", name: "BLACKPINK" },
  { id: "squid-game", name: "Squid Game" },
  { id: "parasite", name: "Parasite" },
  { id: "international-films", name: "International Films" },
  { id: "foreign-language-films", name: "Foreign Language Films" },
  { id: "subtitles-vs-dubbing", name: "Subtitles vs Dubbing" },
  { id: "film-festivals", name: "Film Festivals" },
  { id: "cannes", name: "Cannes" },
  { id: "sundance", name: "Sundance" },
  { id: "toronto-film-festival", name: "Toronto Film Festival" },
  { id: "independent-films", name: "Independent Films" },
  { id: "arthouse-films", name: "Arthouse Films" },
  { id: "cult-films", name: "Cult Films" },
  { id: "b-movies", name: "B-Movies" },
  { id: "so-bad-its-good", name: "So Bad It's Good" },
  { id: "guilty-pleasures", name: "Guilty Pleasures" },
  { id: "comfort-food-media", name: "Comfort Food Media" },
  { id: "nostalgia-bait", name: "Nostalgia Bait" },
  { id: "reboots-remakes", name: "Reboots & Remakes" },
  { id: "sequels", name: "Sequels" },
  { id: "prequels", name: "Prequels" },
  { id: "spin-offs", name: "Spin-offs" },
  { id: "expanded-universe", name: "Expanded Universe" },
  { id: "cinematic-universe", name: "Cinematic Universe" },
  { id: "shared-universe", name: "Shared Universe" },
  { id: "crossovers", name: "Crossovers" },
  { id: "easter-eggs-movies", name: "Easter Eggs (Movies)" },
  { id: "post-credits-scenes", name: "Post-Credits Scenes" },
  { id: "director-cuts", name: "Director's Cuts" },
  { id: "extended-editions", name: "Extended Editions" },
  { id: "theatrical-vs-directors", name: "Theatrical vs Director's Cut" },
  { id: "snyder-cut", name: "Snyder Cut" },
  { id: "fan-edits", name: "Fan Edits" },
  { id: "film-theory", name: "Film Theory" },
  { id: "fan-theories", name: "Fan Theories" },
  { id: "plot-holes", name: "Plot Holes" },
  { id: "continuity-errors", name: "Continuity Errors" },
  { id: "movie-mistakes", name: "Movie Mistakes" },
  { id: "goofs", name: "Goofs" },
  { id: "bloopers", name: "Bloopers" },
  { id: "outtakes", name: "Outtakes" },
  { id: "behind-the-scenes", name: "Behind the Scenes" },
  { id: "making-of", name: "Making Of" },
  { id: "dvd-commentaries", name: "DVD Commentaries" },
  { id: "special-features", name: "Special Features" },
  { id: "deleted-scenes", name: "Deleted Scenes" },
  { id: "alternate-endings", name: "Alternate Endings" },
  { id: "movie-trivia", name: "Movie Trivia" },
  { id: "film-facts", name: "Film Facts" },
  { id: "movie-quotes", name: "Movie Quotes" },
  { id: "iconic-lines", name: "Iconic Lines" },
  { id: "catchphrases", name: "Catchphrases" },
  { id: "movie-references", name: "Movie References" },
  { id: "pop-culture-references", name: "Pop Culture References" },
  { id: "self-referential-humor", name: "Self-Referential Humor" },
  { id: "meta-humor", name: "Meta Humor" },
  { id: "breaking-fourth-wall", name: "Breaking the Fourth Wall" },
  { id: "deadpool", name: "Deadpool" },
  { id: "satire", name: "Satire" },
  { id: "parody", name: "Parody" },
  { id: "spoof-movies", name: "Spoof Movies" },
  { id: "mockumentary", name: "Mockumentary" },
  { id: "found-footage", name: "Found Footage" },
  { id: "blair-witch", name: "Blair Witch" },
  { id: "paranormal-activity", name: "Paranormal Activity" },
  { id: "cloverfield", name: "Cloverfield" },
  { id: "monster-movies", name: "Monster Movies" },
  { id: "kaiju", name: "Kaiju" },
  { id: "godzilla", name: "Godzilla" },
  { id: "king-kong", name: "King Kong" },
  { id: "pacific-rim", name: "Pacific Rim" },
  { id: "transformers", name: "Transformers" },
  { id: "robots-in-disguise", name: "Robots in Disguise" },
  { id: "mecha", name: "Mecha" },
  { id: "giant-robots", name: "Giant Robots" },
  { id: "sci-fi-tropes", name: "Sci-Fi Tropes" },
  { id: "time-travel", name: "Time Travel" },
  { id: "time-loops", name: "Time Loops" },
  { id: "groundhog-day-movie", name: "Groundhog Day (Movie)" },
  { id: "multiverse", name: "Multiverse" },
  { id: "parallel-dimensions", name: "Parallel Dimensions" },
  { id: "alternate-reality", name: "Alternate Reality" },
  { id: "dystopian-futures", name: "Dystopian Futures" },
  { id: "post-apocalyptic", name: "Post-Apocalyptic" },
  { id: "zombie-apocalypse", name: "Zombie Apocalypse" },
  { id: "zombie-movies", name: "Zombie Movies" },
  { id: "walking-dead", name: "The Walking Dead" },
  { id: "vampire-movies", name: "Vampire Movies" },
  { id: "twilight", name: "Twilight" },
  { id: "werewolf-movies", name: "Werewolf Movies" },
  { id: "supernatural-horror", name: "Supernatural Horror" },
  { id: "psychological-horror", name: "Psychological Horror" },
  { id: "slasher-films", name: "Slasher Films" },
  { id: "friday-13th", name: "Friday the 13th" },
  { id: "halloween-franchise", name: "Halloween (Franchise)" },
  { id: "nightmare-elm-street", name: "A Nightmare on Elm Street" },
  { id: "scream", name: "Scream" },
  { id: "saw", name: "Saw" },
  { id: "final-destination", name: "Final Destination" },
  { id: "horror-franchises", name: "Horror Franchises" },
  { id: "horror-sequels", name: "Horror Sequels" },
  { id: "jump-scares", name: "Jump Scares" },
  { id: "gore", name: "Gore" },
  { id: "body-horror", name: "Body Horror" },
  { id: "cosmic-horror", name: "Cosmic Horror" },
  { id: "lovecraftian", name: "Lovecraftian" },
  { id: "existential-dread", name: "Existential Dread" },
  { id: "creepypasta", name: "Creepypasta" },
  { id: "internet-horror", name: "Internet Horror" },
  { id: "analog-horror", name: "Analog Horror" },
  { id: "liminal-spaces", name: "Liminal Spaces" },
  { id: "backrooms", name: "Backrooms" },
  { id: "scp-foundation", name: "SCP Foundation" },
  { id: "arg", name: "ARG (Alternate Reality Games)" },
  { id: "mystery-box", name: "Mystery Box" },
  { id: "puzzle-solving", name: "Puzzle Solving" },
  { id: "escape-rooms", name: "Escape Rooms" },
  { id: "treasure-hunts", name: "Treasure Hunts" },
  { id: "scavenger-hunts", name: "Scavenger Hunts" },
  { id: "geocaching-pop", name: "Geocaching" },
  { id: "urban-exploration", name: "Urban Exploration" },
  { id: "abandoned-places", name: "Abandoned Places" },
  { id: "ghost-towns", name: "Ghost Towns" },
  { id: "haunted-locations", name: "Haunted Locations" },
  { id: "paranormal-investigation", name: "Paranormal Investigation" },
  { id: "ghost-hunting", name: "Ghost Hunting" },
  { id: "spirit-communication", name: "Spirit Communication" },
  { id: "ouija-boards", name: "Ouija Boards" },
  { id: "seances", name: "Seances" },
  { id: "mediums", name: "Mediums" },
  { id: "psychics", name: "Psychics" },
  { id: "fortune-telling", name: "Fortune Telling" },
  { id: "palm-reading", name: "Palm Reading" },
  { id: "crystal-balls", name: "Crystal Balls" },
  { id: "tarot-reading", name: "Tarot Reading" },
  { id: "astrology-readings", name: "Astrology Readings" },
  { id: "numerology", name: "Numerology" },
  { id: "zodiac-signs", name: "Zodiac Signs" },
  { id: "mercury-retrograde", name: "Mercury Retrograde" },
  { id: "full-moons", name: "Full Moons" },
  { id: "lunar-cycles", name: "Lunar Cycles" },
  { id: "solar-eclipses", name: "Solar Eclipses" },
  { id: "lunar-eclipses", name: "Lunar Eclipses" },
  { id: "celestial-events", name: "Celestial Events" },
  { id: "meteor-showers", name: "Meteor Showers" },
  { id: "shooting-stars", name: "Shooting Stars" },
  { id: "comets", name: "Comets" },
  { id: "asteroids", name: "Asteroids" },
  { id: "space-junk", name: "Space Junk" },
  { id: "satellites", name: "Satellites" },
  { id: "space-stations", name: "Space Stations" },
  { id: "international-space-station", name: "International Space Station" },
  { id: "astronauts", name: "Astronauts" },
  { id: "cosmonauts", name: "Cosmonauts" },
  { id: "space-tourism", name: "Space Tourism" },
  { id: "blue-origin", name: "Blue Origin" },
  { id: "virgin-galactic", name: "Virgin Galactic" },
  { id: "space-race", name: "Space Race" },
  { id: "moon-landing", name: "Moon Landing" },
  { id: "apollo-missions", name: "Apollo Missions" },
  { id: "mars-rover", name: "Mars Rover" },
  { id: "perseverance", name: "Perseverance" },
  { id: "curiosity", name: "Curiosity" },
  { id: "james-webb-telescope", name: "James Webb Telescope" },
  { id: "hubble-telescope", name: "Hubble Telescope" },
  { id: "space-photography", name: "Space Photography" },
  { id: "astronomy", name: "Astronomy" },
  { id: "astrophysics", name: "Astrophysics" },
  { id: "black-holes", name: "Black Holes" },
  { id: "event-horizon", name: "Event Horizon" },
  { id: "wormholes", name: "Wormholes" },
  { id: "dark-matter", name: "Dark Matter" },
  { id: "dark-energy", name: "Dark Energy" },
  { id: "big-bang", name: "Big Bang" },
  { id: "multiverse-theory", name: "Multiverse Theory" },
  { id: "string-theory", name: "String Theory" },
  { id: "quantum-physics", name: "Quantum Physics" },
  { id: "quantum-computing", name: "Quantum Computing" },
  { id: "quantum-entanglement", name: "Quantum Entanglement" },
  { id: "particle-physics", name: "Particle Physics" },
  { id: "higgs-boson", name: "Higgs Boson" },
  { id: "large-hadron-collider", name: "Large Hadron Collider" },
  { id: "cern", name: "CERN" },
  { id: "scientific-discoveries", name: "Scientific Discoveries" },
  { id: "nobel-prizes", name: "Nobel Prizes" },
  { id: "breakthrough-innovations", name: "Breakthrough Innovations" },
  { id: "medical-breakthroughs", name: "Medical Breakthroughs" },
  { id: "gene-therapy", name: "Gene Therapy" },
  { id: "crispr", name: "CRISPR" },
  { id: "genetic-engineering", name: "Genetic Engineering" },
  { id: "cloning", name: "Cloning" },
  { id: "stem-cells", name: "Stem Cells" },
  { id: "organ-transplants", name: "Organ Transplants" },
  { id: "3d-printed-organs", name: "3D Printed Organs" },
  { id: "prosthetics", name: "Prosthetics" },
  { id: "bionic-limbs", name: "Bionic Limbs" },
  { id: "cyborgs", name: "Cyborgs" },
  { id: "transhumanism", name: "Transhumanism" },
  { id: "life-extension", name: "Life Extension" },
  { id: "immortality", name: "Immortality" },
  { id: "cryonics", name: "Cryonics" },
  { id: "uploading-consciousness", name: "Uploading Consciousness" },
  { id: "digital-afterlife", name: "Digital Afterlife" },
  { id: "virtual-immortality", name: "Virtual Immortality" },
  { id: "simulation-theory", name: "Simulation Theory" },
  { id: "matrix-theory", name: "Matrix Theory" },
  { id: "reality-simulation", name: "Reality Simulation" },
  { id: "computer-simulation", name: "Computer Simulation" },
  { id: "holographic-principle", name: "Holographic Principle" },
  { id: "holodeck", name: "Holodeck" },
  { id: "star-trek", name: "Star Trek" },
  { id: "star-wars", name: "Star Wars" },
  { id: "jedi", name: "Jedi" },
  { id: "sith", name: "Sith" },
  { id: "force", name: "The Force" },
  { id: "lightsabers", name: "Lightsabers" },
  { id: "death-star", name: "Death Star" },
  { id: "millennium-falcon", name: "Millennium Falcon" },
  { id: "darth-vader", name: "Darth Vader" },
  { id: "luke-skywalker", name: "Luke Skywalker" },
  { id: "princess-leia", name: "Princess Leia" },
  { id: "han-solo", name: "Han Solo" },
  { id: "chewbacca", name: "Chewbacca" },
  { id: "yoda", name: "Yoda" },
  { id: "baby-yoda", name: "Baby Yoda" },
  { id: "grogu", name: "Grogu" },
  { id: "mandalorian", name: "The Mandalorian" },
  { id: "disney-plus", name: "Disney Plus" },
  { id: "streaming-wars", name: "Streaming Wars" },
  { id: "netflix-vs-disney", name: "Netflix vs Disney" },
  { id: "hbo-max", name: "HBO Max" },
  { id: "amazon-prime", name: "Amazon Prime" },
  { id: "hulu", name: "Hulu" },
  { id: "paramount-plus", name: "Paramount Plus" },
  { id: "peacock", name: "Peacock" },
  { id: "apple-tv-plus", name: "Apple TV Plus" },
  { id: "cord-cutting", name: "Cord Cutting" },
  { id: "cable-tv", name: "Cable TV" },
  { id: "satellite-tv", name: "Satellite TV" },
  { id: "antenna-tv", name: "Antenna TV" },
  { id: "over-the-air", name: "Over-the-Air" },
  { id: "broadcast-tv", name: "Broadcast TV" },
  { id: "network-tv", name: "Network TV" },
  { id: "premium-channels", name: "Premium Channels" },
  { id: "pay-per-view", name: "Pay-Per-View" },
  { id: "on-demand", name: "On-Demand" },
  { id: "dvr", name: "DVR" },
  { id: "tivo", name: "TiVo" },
  { id: "vcr", name: "VCR" },
  { id: "vhs", name: "VHS" },
  { id: "dvd", name: "DVD" },
  { id: "blu-ray", name: "Blu-ray" },
  { id: "4k-uhd", name: "4K UHD" },
  { id: "8k", name: "8K" },
  { id: "hdr", name: "HDR" },
  { id: "dolby-vision", name: "Dolby Vision" },
  { id: "dolby-atmos", name: "Dolby Atmos" },
  { id: "surround-sound", name: "Surround Sound" },
  { id: "home-theater", name: "Home Theater" },
  { id: "soundbars", name: "Soundbars" },
  { id: "smart-tvs", name: "Smart TVs" },
  { id: "roku", name: "Roku" },
  { id: "chromecast", name: "Chromecast" },
  { id: "apple-tv", name: "Apple TV" },
  { id: "fire-tv", name: "Fire TV" },
  { id: "android-tv", name: "Android TV" },
  { id: "webos", name: "webOS" },
  { id: "tizen", name: "Tizen" },
  { id: "smart-home", name: "Smart Home" },
  { id: "iot", name: "IoT (Internet of Things)" },
  { id: "alexa", name: "Alexa" },
  { id: "google-assistant", name: "Google Assistant" },
  { id: "siri", name: "Siri" },
  { id: "voice-assistants", name: "Voice Assistants" },
  { id: "smart-speakers", name: "Smart Speakers" },
  { id: "echo", name: "Echo" },
  { id: "google-home", name: "Google Home" },
  { id: "homepod", name: "HomePod" },
  { id: "nest", name: "Nest" },
  { id: "ring", name: "Ring" },
  { id: "doorbell-cameras", name: "Doorbell Cameras" },
  { id: "security-cameras", name: "Security Cameras" },
  { id: "surveillance", name: "Surveillance" },
  { id: "privacy-concerns", name: "Privacy Concerns" },
  { id: "data-collection", name: "Data Collection" },
  { id: "big-tech", name: "Big Tech" },
  { id: "tech-monopolies", name: "Tech Monopolies" },
  { id: "antitrust", name: "Antitrust" },
  { id: "regulation", name: "Regulation" },
  { id: "censorship", name: "Censorship" },
  { id: "content-moderation", name: "Content Moderation" },
  { id: "fact-checking", name: "Fact-Checking" },
  { id: "misinformation", name: "Misinformation" },
  { id: "disinformation", name: "Disinformation" },
  { id: "fake-news", name: "Fake News" },
  { id: "deepfakes", name: "Deepfakes" },
  { id: "ai-generated-content", name: "AI Generated Content" },
  { id: "machine-learning", name: "Machine Learning" },
  { id: "neural-networks", name: "Neural Networks" },
  { id: "gpt", name: "GPT" },
  { id: "language-models", name: "Language Models" },
  { id: "ai-art", name: "AI Art" },
  { id: "midjourney", name: "Midjourney" },
  { id: "dall-e", name: "DALL-E" },
  { id: "stable-diffusion", name: "Stable Diffusion" },
  { id: "ai-music", name: "AI Music" },
  { id: "ai-writing", name: "AI Writing" },
  { id: "ai-coding", name: "AI Coding" },
  { id: "github-copilot", name: "GitHub Copilot" },
  { id: "ai-assistants", name: "AI Assistants" },
  { id: "job-automation", name: "Job Automation" },
  { id: "universal-basic-income", name: "Universal Basic Income" },
  { id: "future-of-work", name: "Future of Work" },
  { id: "remote-work-future", name: "Remote Work Future" },
  { id: "metaverse-work", name: "Metaverse Work" },
  { id: "virtual-offices", name: "Virtual Offices" },
  { id: "vr-meetings", name: "VR Meetings" },
  { id: "ar-applications", name: "AR Applications" },
  { id: "mixed-reality", name: "Mixed Reality" },
  { id: "extended-reality", name: "Extended Reality" },
  { id: "haptic-feedback", name: "Haptic Feedback" },
  { id: "brain-computer-interface", name: "Brain-Computer Interface" },
  { id: "neuralink", name: "Neuralink" },
  { id: "thought-control", name: "Thought Control" },
  { id: "telepathy", name: "Telepathy" },
  { id: "mind-reading", name: "Mind Reading" },
  { id: "consciousness-uploading", name: "Consciousness Uploading" },
  { id: "digital-twins", name: "Digital Twins" },
  { id: "virtual-humans", name: "Virtual Humans" },
  { id: "avatars", name: "Avatars" },
  { id: "digital-personas", name: "Digital Personas" },
  { id: "online-identity", name: "Online Identity" },
  { id: "digital-footprint", name: "Digital Footprint" },
  { id: "online-reputation", name: "Online Reputation" },
  { id: "social-credit", name: "Social Credit" },
  { id: "surveillance-capitalism", name: "Surveillance Capitalism" },
  { id: "data-mining", name: "Data Mining" },
  { id: "algorithmic-bias", name: "Algorithmic Bias" },
  { id: "filter-bubbles", name: "Filter Bubbles" },
  { id: "echo-chambers", name: "Echo Chambers" },
  { id: "polarization", name: "Polarization" },
  { id: "tribal-thinking", name: "Tribal Thinking" },
  { id: "confirmation-bias", name: "Confirmation Bias" },
  { id: "cognitive-dissonance", name: "Cognitive Dissonance" },
  { id: "dunning-kruger", name: "Dunning-Kruger Effect" },
  { id: "impostor-syndrome", name: "Impostor Syndrome" },
  { id: "fomo", name: "FOMO (Fear of Missing Out)" },
  { id: "jomo", name: "JOMO (Joy of Missing Out)" },
  { id: "digital-detox", name: "Digital Detox" },
  { id: "social-media-break", name: "Social Media Break" },
  { id: "unplugging", name: "Unplugging" },
  { id: "mindful-technology", name: "Mindful Technology" },
  { id: "tech-wellness", name: "Tech Wellness" },
  { id: "screen-time", name: "Screen Time" },
  { id: "blue-light", name: "Blue Light" },
  { id: "digital-eye-strain", name: "Digital Eye Strain" },
  { id: "text-neck", name: "Text Neck" },
  { id: "tech-posture", name: "Tech Posture" },
  { id: "carpal-tunnel", name: "Carpal Tunnel" },
  { id: "repetitive-strain", name: "Repetitive Strain" },
  { id: "ergonomics", name: "Ergonomics" },
  { id: "standing-desks", name: "Standing Desks" },
  { id: "wfh-setup", name: "WFH Setup" },
  { id: "home-office", name: "Home Office" },
  { id: "productivity-tools", name: "Productivity Tools" },
  { id: "collaboration-tools", name: "Collaboration Tools" },
  { id: "project-management", name: "Project Management" },
  { id: "agile", name: "Agile" },
  { id: "scrum", name: "Scrum" },
  { id: "kanban", name: "Kanban" },
  { id: "lean", name: "Lean" },
  { id: "six-sigma", name: "Six Sigma" },
  { id: "continuous-improvement", name: "Continuous Improvement" },
  { id: "growth-hacking", name: "Growth Hacking" },
  { id: "mvp", name: "MVP (Minimum Viable Product)" },
  { id: "lean-startup", name: "Lean Startup" },
  { id: "fail-fast", name: "Fail Fast" },
  { id: "pivot", name: "Pivot" },
  { id: "iterate", name: "Iterate" },
  { id: "disrupt", name: "Disrupt" },
  { id: "innovation", name: "Innovation" },
  { id: "disruption", name: "Disruption" },
  { id: "digital-transformation", name: "Digital Transformation" },
  { id: "cloud-computing", name: "Cloud Computing" },
  { id: "saas", name: "SaaS (Software as a Service)" },
  { id: "paas", name: "PaaS (Platform as a Service)" },
  { id: "iaas", name: "IaaS (Infrastructure as a Service)" },
  { id: "edge-computing", name: "Edge Computing" },
  { id: "5g", name: "5G" },
  { id: "6g", name: "6G" },
  { id: "internet-speed", name: "Internet Speed" },
  { id: "fiber-optic", name: "Fiber Optic" },
  { id: "broadband", name: "Broadband" },
  { id: "net-neutrality", name: "Net Neutrality" },
  { id: "digital-divide", name: "Digital Divide" },
  { id: "internet-access", name: "Internet Access" },
  { id: "wifi-everywhere", name: "WiFi Everywhere" },
  { id: "satellite-internet", name: "Satellite Internet" },
  { id: "starlink", name: "Starlink" },
  { id: "space-internet", name: "Space Internet" },
  { id: "global-connectivity", name: "Global Connectivity" },
  { id: "digital-nomadism", name: "Digital Nomadism" },
  { id: "location-independence", name: "Location Independence" },
  { id: "work-anywhere", name: "Work Anywhere" },
  { id: "laptop-lifestyle", name: "Laptop Lifestyle" },
  { id: "van-life", name: "Van Life" },
  { id: "nomad-life", name: "Nomad Life" },
  { id: "travel-while-working", name: "Travel While Working" },
  { id: "workations", name: "Workations" },
  { id: "co-working-spaces", name: "Co-working Spaces" },
  { id: "co-living", name: "Co-living" },
  { id: "sharing-economy", name: "Sharing Economy" },
  { id: "airbnb", name: "Airbnb" },
  { id: "uber", name: "Uber" },
  { id: "lyft", name: "Lyft" },
  { id: "rideshare", name: "Rideshare" },
  { id: "car-sharing", name: "Car Sharing" },
  { id: "bike-sharing", name: "Bike Sharing" },
  { id: "scooter-sharing", name: "Scooter Sharing" },
  { id: "micro-mobility", name: "Micro-mobility" },
  { id: "e-bikes", name: "E-bikes" },
  { id: "e-scooters", name: "E-scooters" },
  { id: "electric-transportation", name: "Electric Transportation" },
  { id: "ev-charging", name: "EV Charging" },
  { id: "charging-stations", name: "Charging Stations" },
  { id: "range-anxiety", name: "Range Anxiety" },
  { id: "battery-technology", name: "Battery Technology" },
  { id: "solid-state-batteries", name: "Solid State Batteries" },
  { id: "energy-storage", name: "Energy Storage" },
  { id: "grid-storage", name: "Grid Storage" },
  { id: "smart-grid", name: "Smart Grid" },
  { id: "renewable-grid", name: "Renewable Grid" },
  { id: "carbon-neutral", name: "Carbon Neutral" },
  { id: "net-zero", name: "Net Zero" },
  { id: "carbon-footprint", name: "Carbon Footprint" },
  { id: "carbon-offset", name: "Carbon Offset" },
  { id: "carbon-capture", name: "Carbon Capture" },
  { id: "direct-air-capture", name: "Direct Air Capture" },
  { id: "carbon-sequestration", name: "Carbon Sequestration" },
  { id: "reforestation", name: "Reforestation" },
  { id: "afforestation", name: "Afforestation" },
  { id: "tree-planting", name: "Tree Planting" },
  { id: "environmental-activism", name: "Environmental Activism" },
  { id: "climate-activism", name: "Climate Activism" },
  { id: "greta-thunberg", name: "Greta Thunberg" },
  { id: "fridays-for-future", name: "Fridays for Future" },
  { id: "extinction-rebellion", name: "Extinction Rebellion" },
  { id: "just-stop-oil", name: "Just Stop Oil" },
  { id: "greenpeace", name: "Greenpeace" },
  { id: "wwf", name: "WWF" },
  { id: "earth-hour", name: "Earth Hour" },
  { id: "earth-day-pop", name: "Earth Day" },
  { id: "world-environment-day", name: "World Environment Day" },
  { id: "cop-climate-summit", name: "COP Climate Summit" },
  { id: "paris-agreement", name: "Paris Agreement" },
  { id: "kyoto-protocol", name: "Kyoto Protocol" },
  { id: "ipcc-reports", name: "IPCC Reports" },
  { id: "climate-science", name: "Climate Science" },
  { id: "climate-models", name: "Climate Models" },
  { id: "temperature-rise", name: "Temperature Rise" },
  { id: "sea-level-rise", name: "Sea Level Rise" },
  { id: "ice-melting", name: "Ice Melting" },
  { id: "glacier-retreat", name: "Glacier Retreat" },
  { id: "polar-ice-caps", name: "Polar Ice Caps" },
  { id: "arctic-warming", name: "Arctic Warming" },
  { id: "permafrost-melting", name: "Permafrost Melting" },
  { id: "methane-release", name: "Methane Release" },
  { id: "greenhouse-gases", name: "Greenhouse Gases" },
  { id: "co2-levels", name: "CO2 Levels" },
  { id: "emissions-reduction", name: "Emissions Reduction" },
  { id: "fossil-fuels", name: "Fossil Fuels" },
  { id: "oil-industry", name: "Oil Industry" },
  { id: "coal-power", name: "Coal Power" },
  { id: "natural-gas", name: "Natural Gas" },
  { id: "fracking", name: "Fracking" },
  { id: "pipeline-protests", name: "Pipeline Protests" },
  { id: "divestment", name: "Divestment" },
  { id: "fossil-fuel-divestment", name: "Fossil Fuel Divestment" },
  { id: "green-investing", name: "Green Investing" },
  { id: "esg-investing", name: "ESG Investing" },
  { id: "sustainable-finance", name: "Sustainable Finance" },
  { id: "green-bonds", name: "Green Bonds" },
  { id: "impact-investing", name: "Impact Investing" },
  { id: "socially-responsible", name: "Socially Responsible Investing" },
  { id: "b-corps", name: "B-Corps" },
  { id: "benefit-corporations", name: "Benefit Corporations" },
  { id: "triple-bottom-line", name: "Triple Bottom Line" },
  { id: "stakeholder-capitalism", name: "Stakeholder Capitalism" },
  { id: "conscious-capitalism", name: "Conscious Capitalism" },
  { id: "purpose-driven", name: "Purpose-Driven Business" },
  { id: "corporate-responsibility", name: "Corporate Responsibility" },
  { id: "corporate-activism", name: "Corporate Activism" },
  { id: "brand-activism", name: "Brand Activism" },
  { id: "cause-marketing", name: "Cause Marketing" },
  { id: "greenwashing", name: "Greenwashing" },
  { id: "virtue-signaling", name: "Virtue Signaling" },
  { id: "performative-activism", name: "Performative Activism" },
  { id: "slacktivism", name: "Slacktivism" },
  { id: "clicktivism", name: "Clicktivism" },
  { id: "hashtag-activism", name: "Hashtag Activism" },
  { id: "online-activism", name: "Online Activism" },
  { id: "digital-activism", name: "Digital Activism" },
  { id: "cyber-activism", name: "Cyber Activism" },
  { id: "hacktivism", name: "Hacktivism" },
  { id: "anonymous", name: "Anonymous" },
  { id: "wikileaks", name: "WikiLeaks" },
  { id: "edward-snowden", name: "Edward Snowden" },
  { id: "julian-assange", name: "Julian Assange" },
  { id: "whistleblowing", name: "Whistleblowing" },
  { id: "transparency", name: "Transparency" },
  { id: "accountability", name: "Accountability" },
  { id: "freedom-of-information", name: "Freedom of Information" },
  { id: "press-freedom", name: "Press Freedom" },
  { id: "journalism", name: "Journalism" },
  { id: "investigative-reporting", name: "Investigative Reporting" },
  { id: "fact-based-journalism", name: "Fact-Based Journalism" },
  { id: "independent-media", name: "Independent Media" },
  { id: "citizen-journalism", name: "Citizen Journalism" },
  { id: "user-generated-news", name: "User Generated News" },
  { id: "crowdsourced-journalism", name: "Crowdsourced Journalism" },
  { id: "collaborative-journalism", name: "Collaborative Journalism" },
  { id: "open-source-intelligence", name: "Open Source Intelligence" },
  { id: "osint", name: "OSINT" },
  { id: "geoint", name: "GEOINT" },
  { id: "bellingcat", name: "Bellingcat" },
  { id: "verification", name: "Verification" },
  { id: "digital-forensics", name: "Digital Forensics" },
  { id: "reverse-image-search", name: "Reverse Image Search" },
  { id: "metadata-analysis", name: "Metadata Analysis" },
  { id: "geolocation", name: "Geolocation" },
  { id: "chronolocation", name: "Chronolocation" },
  { id: "fact-checking-tools", name: "Fact-Checking Tools" },
  { id: "misinformation-detection", name: "Misinformation Detection" },
  { id: "deepfake-detection", name: "Deepfake Detection" },
  { id: "synthetic-media", name: "Synthetic Media" },
  { id: "ai-manipulation", name: "AI Manipulation" },
  { id: "media-literacy", name: "Media Literacy" },
  { id: "digital-literacy", name: "Digital Literacy" },
  { id: "information-literacy", name: "Information Literacy" },
  { id: "critical-thinking", name: "Critical Thinking" },
  { id: "source-evaluation", name: "Source Evaluation" },
  { id: "bias-recognition", name: "Bias Recognition" },
  { id: "logical-fallacies", name: "Logical Fallacies" },
  { id: "rhetorical-devices", name: "Rhetorical Devices" },
  { id: "propaganda-techniques", name: "Propaganda Techniques" },
  { id: "persuasion-tactics", name: "Persuasion Tactics" },
  { id: "influence-operations", name: "Influence Operations" },
  { id: "information-warfare", name: "Information Warfare" },
  { id: "psyops", name: "PsyOps" },
  { id: "soft-power", name: "Soft Power" },
  { id: "cultural-diplomacy", name: "Cultural Diplomacy" },
  { id: "cultural-exchange", name: "Cultural Exchange" },
  { id: "globalization", name: "Globalization" },
  { id: "cultural-globalization", name: "Cultural Globalization" },
  { id: "mcdonaldization", name: "McDonaldization" },
  { id: "americanization", name: "Americanization" },
  { id: "westernization", name: "Westernization" },
  { id: "cultural-imperialism", name: "Cultural Imperialism" },
  { id: "soft-colonialism", name: "Soft Colonialism" },
  { id: "neocolonialism", name: "Neocolonialism" },
  { id: "cultural-appropriation", name: "Cultural Appropriation" },
  { id: "cultural-appreciation", name: "Cultural Appreciation" },
  { id: "cultural-sensitivity", name: "Cultural Sensitivity" },
  { id: "cultural-competence", name: "Cultural Competence" },
  { id: "intercultural-dialogue", name: "Intercultural Dialogue" },
  { id: "cross-cultural", name: "Cross-Cultural" },
  { id: "multicultural", name: "Multicultural" },
  { id: "diversity-equity-inclusion", name: "Diversity, Equity & Inclusion" },
  { id: "dei", name: "DEI" },
  { id: "unconscious-bias", name: "Unconscious Bias" },
  { id: "implicit-bias", name: "Implicit Bias" },
  { id: "microaggressions", name: "Microaggressions" },
  { id: "allyship", name: "Allyship" },
  { id: "solidarity", name: "Solidarity" },
  { id: "intersectionality", name: "Intersectionality" },
  { id: "privilege", name: "Privilege" },
  { id: "white-privilege", name: "White Privilege" },
  { id: "male-privilege", name: "Male Privilege" },
  { id: "systemic-racism", name: "Systemic Racism" },
  { id: "institutional-racism", name: "Institutional Racism" },
  { id: "structural-racism", name: "Structural Racism" },
  { id: "anti-racism", name: "Anti-Racism" },
  { id: "racial-justice", name: "Racial Justice" },
  { id: "social-justice-pop", name: "Social Justice" },
  { id: "civil-rights", name: "Civil Rights" },
  { id: "human-rights-pop", name: "Human Rights" },
  { id: "womens-rights", name: "Women's Rights" },
  { id: "reproductive-rights", name: "Reproductive Rights" },
  { id: "abortion-rights", name: "Abortion Rights" },
  { id: "roe-v-wade", name: "Roe v. Wade" },
  { id: "planned-parenthood", name: "Planned Parenthood" },
  { id: "family-planning", name: "Family Planning" },
  { id: "birth-control", name: "Birth Control" },
  { id: "contraception", name: "Contraception" },
  { id: "maternal-health", name: "Maternal Health" },
  { id: "pregnancy", name: "Pregnancy" },
  { id: "childbirth", name: "Childbirth" },
  { id: "postpartum", name: "Postpartum" },
  { id: "parental-leave", name: "Parental Leave" },
  { id: "childcare", name: "Childcare" },
  { id: "work-life-balance", name: "Work-Life Balance" },
  { id: "glass-ceiling", name: "Glass Ceiling" },
  { id: "gender-pay-gap", name: "Gender Pay Gap" },
  { id: "equal-pay", name: "Equal Pay" },
  { id: "workplace-equality", name: "Workplace Equality" },
  { id: "sexual-harassment", name: "Sexual Harassment" },
  { id: "workplace-harassment", name: "Workplace Harassment" },
  { id: "hostile-work-environment", name: "Hostile Work Environment" },
  { id: "hr-issues", name: "HR Issues" },
  { id: "employee-rights", name: "Employee Rights" },
  { id: "labor-rights", name: "Labor Rights" },
  { id: "workers-rights", name: "Workers' Rights" },
  { id: "union-organizing", name: "Union Organizing" },
  { id: "collective-bargaining", name: "Collective Bargaining" },
  { id: "strikes", name: "Strikes" },
  { id: "labor-disputes", name: "Labor Disputes" },
  { id: "minimum-wage", name: "Minimum Wage" },
  { id: "living-wage", name: "Living Wage" },
  { id: "wage-theft", name: "Wage Theft" },
  { id: "exploitation", name: "Exploitation" },
  { id: "worker-exploitation", name: "Worker Exploitation" },
  { id: "sweatshops", name: "Sweatshops" },
  { id: "child-labor", name: "Child Labor" },
  { id: "forced-labor", name: "Forced Labor" },
  { id: "human-trafficking", name: "Human Trafficking" },
  { id: "modern-slavery", name: "Modern Slavery" },
  { id: "supply-chain-ethics", name: "Supply Chain Ethics" },
  { id: "ethical-consumption", name: "Ethical Consumption" },
  { id: "conscious-consumerism", name: "Conscious Consumerism" },
  { id: "sustainable-fashion", name: "Sustainable Fashion" },
  { id: "slow-fashion", name: "Slow Fashion" },
  { id: "ethical-fashion", name: "Ethical Fashion" },
  { id: "circular-fashion", name: "Circular Fashion" },
  { id: "upcycling", name: "Upcycling" },
  { id: "thrifting", name: "Thrifting" },
  { id: "vintage-fashion", name: "Vintage Fashion" },
  { id: "secondhand-shopping", name: "Secondhand Shopping" },
  { id: "consignment", name: "Consignment" },
  { id: "clothing-swap", name: "Clothing Swap" },
  { id: "capsule-wardrobe", name: "Capsule Wardrobe" },
  { id: "minimalist-fashion", name: "Minimalist Fashion" },
  { id: "quality-over-quantity", name: "Quality Over Quantity" },
  { id: "investment-pieces", name: "Investment Pieces" },
  { id: "timeless-style", name: "Timeless Style" },
  { id: "classic-fashion", name: "Classic Fashion" },
  { id: "seasonal-trends", name: "Seasonal Trends" },
  { id: "fashion-cycles", name: "Fashion Cycles" },
  { id: "trend-forecasting", name: "Trend Forecasting" },
  { id: "fashion-influencers", name: "Fashion Influencers" },
  { id: "style-bloggers", name: "Style Bloggers" },
  { id: "fashion-photography", name: "Fashion Photography" },
  { id: "street-style", name: "Street Style" },
  { id: "fashion-street-photography", name: "Fashion Street Photography" },
  { id: "outfit-of-the-day", name: "Outfit of the Day" },
  { id: "ootd", name: "OOTD" },
  { id: "fashion-hauls", name: "Fashion Hauls" },
  { id: "try-on-hauls", name: "Try-On Hauls" },
  { id: "styling-videos", name: "Styling Videos" },
  { id: "fashion-tutorials", name: "Fashion Tutorials" },
  { id: "diy-fashion", name: "DIY Fashion" },
  { id: "sewing", name: "Sewing" },
  { id: "pattern-making", name: "Pattern Making" },
  { id: "fashion-design", name: "Fashion Design" },
  { id: "haute-couture", name: "Haute Couture" },
  { id: "ready-to-wear", name: "Ready-to-Wear" },
  { id: "pret-a-porter", name: "Prêt-à-Porter" },
  { id: "runway-shows", name: "Runway Shows" },
  { id: "fashion-shows", name: "Fashion Shows" },
  { id: "paris-fashion-week", name: "Paris Fashion Week" },
  { id: "milan-fashion-week", name: "Milan Fashion Week" },
  { id: "new-york-fashion-week", name: "New York Fashion Week" },
  { id: "london-fashion-week", name: "London Fashion Week" },
  { id: "met-gala", name: "Met Gala" },
  { id: "fashion-awards", name: "Fashion Awards" },
  { id: "cfda-awards", name: "CFDA Awards" },
  { id: "british-fashion-awards", name: "British Fashion Awards" },
  { id: "fashion-magazines", name: "Fashion Magazines" },
  { id: "vogue", name: "Vogue" },
  { id: "harpers-bazaar", name: "Harper's Bazaar" },
  { id: "elle", name: "Elle" },
  { id: "marie-claire", name: "Marie Claire" },
  { id: "cosmopolitan", name: "Cosmopolitan" },
  { id: "glamour", name: "Glamour" },
  { id: "allure", name: "Allure" },
  { id: "beauty-magazines", name: "Beauty Magazines" },
  { id: "beauty-industry", name: "Beauty Industry" },
  { id: "cosmetics", name: "Cosmetics" },
  { id: "makeup-industry", name: "Makeup Industry" },
  { id: "skincare-industry", name: "Skincare Industry" },
  { id: "beauty-brands", name: "Beauty Brands" },
  { id: "indie-beauty", name: "Indie Beauty" },
  { id: "clean-beauty", name: "Clean Beauty" },
  { id: "natural-beauty", name: "Natural Beauty" },
  { id: "organic-beauty", name: "Organic Beauty" },
  { id: "cruelty-free", name: "Cruelty-Free" },
  { id: "vegan-beauty", name: "Vegan Beauty" },
  { id: "sustainable-beauty", name: "Sustainable Beauty" },
  { id: "zero-waste-beauty", name: "Zero Waste Beauty" },
  { id: "refillable-packaging", name: "Refillable Packaging" },
  { id: "plastic-free-beauty", name: "Plastic-Free Beauty" },
  { id: "eco-friendly-packaging", name: "Eco-Friendly Packaging" },
  { id: "packaging-innovation", name: "Packaging Innovation" },
  { id: "beauty-tech", name: "Beauty Tech" },
  { id: "ar-makeup", name: "AR Makeup" },
  { id: "virtual-try-on", name: "Virtual Try-On" },
  { id: "ai-beauty", name: "AI Beauty" },
  { id: "personalized-beauty", name: "Personalized Beauty" },
  { id: "custom-formulations", name: "Custom Formulations" },
  { id: "dna-based-skincare", name: "DNA-Based Skincare" },
  { id: "microbiome-skincare", name: "Microbiome Skincare" },
  { id: "probiotic-skincare", name: "Probiotic Skincare" },
  { id: "fermented-skincare", name: "Fermented Skincare" },
  { id: "k-beauty", name: "K-Beauty" },
  { id: "korean-skincare", name: "Korean Skincare" },
  { id: "j-beauty", name: "J-Beauty" },
  { id: "japanese-skincare", name: "Japanese Skincare" },
  { id: "c-beauty", name: "C-Beauty" },
  { id: "chinese-beauty", name: "Chinese Beauty" },
  { id: "global-beauty", name: "Global Beauty" },
  { id: "beauty-rituals", name: "Beauty Rituals" },
  { id: "skincare-routines", name: "Skincare Routines" },
  { id: "morning-skincare", name: "Morning Skincare" },
  { id: "evening-skincare", name: "Evening Skincare" },
  { id: "double-cleansing", name: "Double Cleansing" },
  { id: "multi-step-skincare", name: "Multi-Step Skincare" },
  { id: "minimalist-skincare", name: "Minimalist Skincare" },
  { id: "skinimalism", name: "Skinimalism" },
  { id: "no-makeup-makeup", name: "No-Makeup Makeup" },
  { id: "glass-skin", name: "Glass Skin" },
  { id: "dewy-skin", name: "Dewy Skin" },
  { id: "glowing-skin", name: "Glowing Skin" },
  { id: "healthy-skin", name: "Healthy Skin" },
  { id: "skin-positivity", name: "Skin Positivity" },
  { id: "acne-positivity", name: "Acne Positivity" },
  { id: "aging-gracefully", name: "Aging Gracefully" },
  { id: "anti-aging", name: "Anti-Aging" },
  { id: "age-positive", name: "Age Positive" },
  { id: "mature-beauty", name: "Mature Beauty" },
  { id: "silver-hair", name: "Silver Hair" },
  { id: "gray-hair-acceptance", name: "Gray Hair Acceptance" },
  { id: "natural-hair", name: "Natural Hair" },
  { id: "curly-hair", name: "Curly Hair" },
  { id: "textured-hair", name: "Textured Hair" },
  { id: "afro-hair", name: "Afro Hair" },
  { id: "black-hair-care", name: "Black Hair Care" },
  { id: "protective-styles", name: "Protective Styles" },
  { id: "hair-culture", name: "Hair Culture" },
  { id: "crown-act", name: "CROWN Act" },
  { id: "hair-discrimination", name: "Hair Discrimination" },
  { id: "workplace-hair-policies", name: "Workplace Hair Policies" },
  { id: "hair-acceptance", name: "Hair Acceptance" },
  { id: "hair-diversity", name: "Hair Diversity" },
  { id: "inclusive-beauty", name: "Inclusive Beauty" },
  { id: "beauty-diversity", name: "Beauty Diversity" },
  { id: "shade-range", name: "Shade Range" },
  { id: "inclusive-shade-range", name: "Inclusive Shade Range" },
  { id: "fenty-effect", name: "Fenty Effect" },
  { id: "beauty-representation", name: "Beauty Representation" },
  { id: "diverse-models", name: "Diverse Models" },
  { id: "body-diverse-models", name: "Body Diverse Models" },
  { id: "plus-size-beauty", name: "Plus-Size Beauty" },
  { id: "adaptive-beauty", name: "Adaptive Beauty" },
  { id: "disability-inclusive", name: "Disability Inclusive Beauty" },
  { id: "accessible-packaging", name: "Accessible Packaging" },
  { id: "universal-design", name: "Universal Design" },
  { id: "beauty-for-all", name: "Beauty for All" },
  { id: "democratizing-beauty", name: "Democratizing Beauty" },
  { id: "affordable-beauty", name: "Affordable Beauty" },
  { id: "drugstore-beauty", name: "Drugstore Beauty" },
  { id: "budget-beauty", name: "Budget Beauty" },
  { id: "luxury-beauty", name: "Luxury Beauty" },
  { id: "prestige-beauty", name: "Prestige Beauty" },
  { id: "high-end-beauty", name: "High-End Beauty" },
  { id: "splurge-vs-save", name: "Splurge vs Save" },
  { id: "dupes", name: "Dupes" },
  { id: "beauty-dupes", name: "Beauty Dupes" },
  { id: "affordable-alternatives", name: "Affordable Alternatives" },
  { id: "beauty-hacks", name: "Beauty Hacks" },
  { id: "diy-beauty", name: "DIY Beauty" },
  { id: "homemade-skincare", name: "Homemade Skincare" },
  { id: "kitchen-beauty", name: "Kitchen Beauty" },
  { id: "natural-ingredients", name: "Natural Ingredients" },
  { id: "beauty-ingredients", name: "Beauty Ingredients" },
  { id: "actives", name: "Actives" },
  { id: "retinol", name: "Retinol" },
  { id: "vitamin-c", name: "Vitamin C" },
  { id: "niacinamide", name: "Niacinamide" },
  { id: "hyaluronic-acid", name: "Hyaluronic Acid" },
  { id: "peptides", name: "Peptides" },
  { id: "aha-bha", name: "AHA/BHA" },
  { id: "chemical-exfoliants", name: "Chemical Exfoliants" },
  { id: "sunscreen", name: "Sunscreen" },
  { id: "spf", name: "SPF" },
  { id: "sun-protection", name: "Sun Protection" },
  { id: "uv-protection", name: "UV Protection" },
  { id: "daily-spf", name: "Daily SPF" },
  { id: "sunscreen-controversy", name: "Sunscreen Controversy" },
  { id: "reef-safe-sunscreen", name: "Reef-Safe Sunscreen" },
  { id: "mineral-sunscreen", name: "Mineral Sunscreen" },
  { id: "chemical-sunscreen", name: "Chemical Sunscreen" },
  { id: "beauty-science", name: "Beauty Science" },
  { id: "cosmetic-chemistry", name: "Cosmetic Chemistry" },
  { id: "ingredient-science", name: "Ingredient Science" },
  { id: "formulation", name: "Formulation" },
  { id: "clinical-testing", name: "Clinical Testing" },
  { id: "dermatologist-tested", name: "Dermatologist Tested" },
  { id: "dermatology", name: "Dermatology" },
  { id: "skincare-professionals", name: "Skincare Professionals" },
  { id: "estheticians", name: "Estheticians" },
  { id: "medical-grade", name: "Medical Grade" },
  { id: "professional-treatments", name: "Professional Treatments" },
  { id: "facial-treatments", name: "Facial Treatments" },
  { id: "spa-treatments", name: "Spa Treatments" },
  { id: "wellness-spa", name: "Wellness Spa" },
  { id: "self-care-routines", name: "Self-Care Routines" },
  { id: "pamper-sessions", name: "Pamper Sessions" },
  { id: "me-time", name: "Me Time" },
  { id: "relaxation", name: "Relaxation" },
  { id: "stress-relief", name: "Stress Relief" },
  { id: "mindful-beauty", name: "Mindful Beauty" },
  { id: "slow-beauty", name: "Slow Beauty" },
  { id: "intentional-beauty", name: "Intentional Beauty" },
  { id: "beauty-minimalism", name: "Beauty Minimalism" },
  { id: "curated-beauty", name: "Curated Beauty" },
  { id: "beauty-editing", name: "Beauty Editing" },
  { id: "product-curation", name: "Product Curation" },
  { id: "beauty-subscription", name: "Beauty Subscription" },
  { id: "sample-sizes", name: "Sample Sizes" },
  { id: "travel-sizes", name: "Travel Sizes" },
  { id: "mini-products", name: "Mini Products" },
  { id: "beauty-minis", name: "Beauty Minis" },
  { id: "value-sets", name: "Value Sets" },
  { id: "gift-sets", name: "Gift Sets" },
  { id: "beauty-gifts", name: "Beauty Gifts" },
  { id: "holiday-beauty", name: "Holiday Beauty" },
  { id: "limited-edition", name: "Limited Edition" },
  { id: "beauty-collections", name: "Beauty Collections" },
  { id: "collaborations", name: "Collaborations" },
  { id: "celebrity-beauty", name: "Celebrity Beauty" },
  { id: "influencer-beauty", name: "Influencer Beauty" },
  { id: "beauty-partnerships", name: "Beauty Partnerships" },
  { id: "brand-collaborations", name: "Brand Collaborations" },
  { id: "crossover-products", name: "Crossover Products" },
  { id: "unexpected-collabs", name: "Unexpected Collaborations" },
  { id: "food-beauty-collabs", name: "Food x Beauty Collaborations" },
  { id: "fashion-beauty-collabs", name: "Fashion x Beauty Collaborations" },
  { id: "tech-beauty-collabs", name: "Tech x Beauty Collaborations" },
  { id: "art-beauty-collabs", name: "Art x Beauty Collaborations" },
  { id: "pop-culture-beauty", name: "Pop Culture x Beauty" },
  { id: "movie-beauty-collabs", name: "Movie x Beauty Collaborations" },
  { id: "tv-beauty-collabs", name: "TV x Beauty Collaborations" },
  { id: "anime-beauty-collabs", name: "Anime x Beauty Collaborations" },
  { id: "gaming-beauty-collabs", name: "Gaming x Beauty Collaborations" },
  { id: "music-beauty-collabs", name: "Music x Beauty Collaborations" }
];

const Index = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedStyle, setSelectedStyle] = useState<string>("");
  const [selectedSubcategory, setSelectedSubcategory] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredOptions, setFilteredOptions] = useState<any[]>([]);
  const [textOptions, setTextOptions] = useState<Array<{ lane: string; text: string }>>([]);
  const [selectedTextOption, setSelectedTextOption] = useState<string>("");
  const [visualOptions, setVisualOptions] = useState<Array<{ lane: string; prompt: string }>>([]);
  const [selectedVisualOption, setSelectedVisualOption] = useState<string>("");
  const [selectedLayout, setSelectedLayout] = useState<string>("memeTopBottom");
  const [generatedImages, setGeneratedImages] = useState<Array<{ id: string; url: string; isSelected: boolean }>>([]);
  const [isGeneratingText, setIsGeneratingText] = useState(false);
  const [isGeneratingVisuals, setIsGeneratingVisuals] = useState(false);
  const [isGeneratingImages, setIsGeneratingImages] = useState(false);
  const [showApiKeyDialog, setShowApiKeyDialog] = useState(false);
  const [showIdeogramKeyDialog, setShowIdeogramKeyDialog] = useState(false);
  const [showProxySettingsDialog, setShowProxySettingsDialog] = useState(false);
  const [showCorsRetryDialog, setShowCorsRetryDialog] = useState(false);
  const [imageGenerationError, setImageGenerationError] = useState<string>("");
  const { toast } = useToast();
  const searchTimeoutRef = useRef<NodeJS.Timeout>();

  // Get subcategory options based on selected style
  const getSubcategoryOptions = () => {
    switch (selectedStyle) {
      case "celebrations":
        return celebrationOptions;
      case "sports":
        return sportsOptions;
      case "daily-life":
        return dailyLifeOptions;
      case "vibes-punchlines":
        return vibesPunchlinesOptions;
      case "pop-culture":
        return popCultureOptions;
      default:
        return [];
    }
  };

  // Handle search functionality
  const handleSearch = (query: string) => {
    const subcategoryOptions = getSubcategoryOptions();
    if (!query.trim()) {
      setFilteredOptions([]);
      return;
    }

    const filtered = subcategoryOptions.filter(option =>
      option.name.toLowerCase().includes(query.toLowerCase())
    );
    setFilteredOptions(filtered);
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      if (value.trim()) {
        handleSearch(value);
      }
    }, 250);
  };

  const handleStyleSelect = (styleId: string) => {
    setSelectedStyle(styleId);
    setSelectedSubcategory("");
    setSearchQuery("");
    setFilteredOptions([]);
  };

  const handleSubcategorySelect = (subcategoryId: string) => {
    setSelectedSubcategory(subcategoryId);
    setSearchQuery("");
    setFilteredOptions([]);
  };

  const handleNextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleGenerateText = async () => {
    setIsGeneratingText(true);
    try {
      const result = await generateStep2Lines({
        category: selectedStyle,
        subcategory: selectedSubcategory,
        tone: "funny",
        tags: []
      });
      setTextOptions(result.lines);
    } catch (error) {
      console.error("Error generating text:", error);
      toast({
        title: "Error",
        description: "Failed to generate text options. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingText(false);
    }
  };

  const handleGenerateVisuals = async () => {
    setIsGeneratingVisuals(true);
    try {
      // This would call the visual generation service
      // For now, using placeholder data
      const mockVisuals = [
        { lane: "option1", prompt: "birthday cake with candles" },
        { lane: "option2", prompt: "party decorations and balloons" },
        { lane: "option3", prompt: "gift boxes and ribbons" },
        { lane: "option4", prompt: "celebration scene with confetti" }
      ];
      setVisualOptions(mockVisuals);
    } catch (error) {
      console.error("Error generating visuals:", error);
      toast({
        title: "Error",
        description: "Failed to generate visual options. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGeneratingVisuals(false);
    }
  };

  const handleGenerateImage = async () => {
    if (!selectedTextOption || !selectedVisualOption) {
      toast({
        title: "Missing Selection",
        description: "Please select both a text option and visual option before generating images.",
        variant: "destructive"
      });
      return;
    }

    setIsGeneratingImages(true);
    setImageGenerationError("");

    try {
      const selectedText = textOptions.find(option => option.lane === selectedTextOption);
      const selectedVisual = visualOptions.find(option => option.lane === selectedVisualOption);
      
      if (!selectedText || !selectedVisual) {
        throw new Error("Selected options not found");
      }

      // Create proper IdeogramHandoff object
      const handoff = buildIdeogramHandoff({
        visual_style: "general",
        subcategory: selectedSubcategory,
        tone: "funny",
        final_line: selectedText.text,
        tags_csv: "",
        chosen_visual: selectedVisual.prompt,
        category: selectedStyle,
        aspect_ratio: selectedLayout,
        text_tags_csv: "",
        visual_tags_csv: "",
        ai_text_assist_used: true,
        ai_visual_assist_used: true
      });
      
      const prompt = buildIdeogramPrompt(handoff, true, layoutMappings[selectedLayout as keyof typeof layoutMappings]?.token);
      
      const result = await generateIdeogramImage({
        model: "V_2",
        prompt: prompt,
        aspect_ratio: getAspectRatioForIdeogram(selectedLayout),
        magic_prompt_option: "AUTO",
        style_type: getStyleTypeForIdeogram("general"),
        seed: Math.floor(Math.random() * 1000000)
      });

      if (result.data && result.data.length > 0) {
        const newImages = result.data.map((imageData: any, index: number) => ({
          id: `generated-${Date.now()}-${index}`,
          url: imageData.url,
          isSelected: index === 0
        }));
        setGeneratedImages(newImages);
        
        toast({
          title: "Success",
          description: "Images generated successfully!",
        });
      } else {
        throw new Error("No images returned from generation");
      }
    } catch (error) {
      console.error("Error generating images:", error);
      let errorMessage = "Failed to generate images. Please try again.";
      
      if (error instanceof IdeogramAPIError) {
        if (error.message.includes("API key")) {
          setShowIdeogramKeyDialog(true);
          errorMessage = "Please set up your Ideogram API key to generate images.";
        } else if (error.message.includes("CORS") || error.message.includes("Network")) {
          setShowCorsRetryDialog(true);
          errorMessage = "Network connection issue. Please check your connection and try again.";
        } else {
          errorMessage = error.message;
        }
      }
      
      setImageGenerationError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setIsGeneratingImages(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-12 px-4 pb-32">
      <div className="max-w-6xl mx-auto">
        
        <StepProgress currentStep={currentStep} />
        
        {currentStep === 1 && (
          <div className="space-y-8">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-4">Choose Your Category</h2>
              <p className="text-xl text-muted-foreground">Select the Category that best fits your Viibe</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {styleOptions.map((style) => (
                <Card
                  key={style.id}
                  className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                    selectedStyle === style.id
                      ? "ring-2 ring-primary border-primary"
                      : "border-border hover:border-primary/50"
                  }`}
                  onClick={() => handleStyleSelect(style.id)}
                >
                  <CardHeader>
                    <CardTitle className="text-lg">{style.name}</CardTitle>
                    <CardDescription>{style.description}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>

            {selectedStyle && (
              <div className="mt-8">
                <div className="text-center mb-6">
                  <h3 className="text-xl font-semibold text-foreground mb-2">Choose Subcategory</h3>
                  <p className="text-muted-foreground">Pick the specific topic that matches your idea</p>
                </div>

                <div className="mb-6">
                  <div className="relative max-w-md mx-auto">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      placeholder="Search subcategories..."
                      value={searchQuery}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <ScrollArea className="h-64">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(searchQuery ? filteredOptions : getSubcategoryOptions()).map((option) => (
                      <Card
                        key={option.id}
                        className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                          selectedSubcategory === option.id
                            ? "ring-2 ring-primary border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                        onClick={() => handleSubcategorySelect(option.id)}
                      >
                        <CardHeader className="py-3">
                          <CardTitle className="text-sm">{option.name}</CardTitle>
                        </CardHeader>
                      </Card>
                    ))}
                  </div>
                </ScrollArea>

                {selectedSubcategory && (
                  <div className="flex justify-center mt-8">
                    <Button onClick={handleNextStep} size="lg">
                      Continue to Text Generation
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {currentStep === 2 && (
          <div className="space-y-8">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-4">Generate Text Options</h2>
              <p className="text-xl text-muted-foreground">Let's create some witty text for your meme</p>
            </div>

            <div className="flex justify-between mb-6">
              <Button variant="outline" onClick={handlePreviousStep}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={handleGenerateText} disabled={isGeneratingText}>
                {isGeneratingText ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  "Generate Text Options"
                )}
              </Button>
            </div>

            {textOptions.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-center">Choose Your Text</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {textOptions.map((option) => (
                    <Card
                      key={option.lane}
                      className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                        selectedTextOption === option.lane
                          ? "ring-2 ring-primary border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                      onClick={() => setSelectedTextOption(option.lane)}
                    >
                      <CardContent className="p-4">
                        <p className="text-center">{option.text}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {selectedTextOption && (
                  <div className="flex justify-center mt-8">
                    <Button onClick={handleNextStep} size="lg">
                      Continue to Visual Generation
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {currentStep === 3 && (
          <div className="space-y-8">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-4">Generate Visual Options</h2>
              <p className="text-xl text-muted-foreground">Choose the perfect visual style for your meme</p>
            </div>

            <div className="flex justify-between mb-6">
              <Button variant="outline" onClick={handlePreviousStep}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={handleGenerateVisuals} disabled={isGeneratingVisuals}>
                {isGeneratingVisuals ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  "Generate Visual Options"
                )}
              </Button>
            </div>

            <div className="mb-6">
              <h3 className="text-lg font-semibold text-center mb-4">Select Text Layout</h3>
              <TextLayoutSelector
                selectedLayout={selectedLayout}
                onLayoutSelect={setSelectedLayout}
              />
            </div>

            {visualOptions.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-center">Choose Your Visual Style</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {visualOptions.map((option) => (
                    <Card
                      key={option.lane}
                      className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                        selectedVisualOption === option.lane
                          ? "ring-2 ring-primary border-primary bg-primary/5"
                          : "border-border hover:border-primary/50"
                      }`}
                      onClick={() => setSelectedVisualOption(option.lane)}
                    >
                      <CardContent className="p-4">
                        <p className="text-center">{option.prompt}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {selectedVisualOption && (
                  <div className="flex justify-center mt-8">
                    <Button onClick={handleNextStep} size="lg">
                      Continue to Image Generation
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {currentStep === 4 && (
          <div className="space-y-8">
            <div className="text-center mb-12">
              <h2 className="text-2xl md:text-3xl font-semibold text-foreground mb-4">Generate Your Meme</h2>
              <p className="text-xl text-muted-foreground">Create the final image with your selected text and visual</p>
            </div>

            <div className="flex justify-between mb-6">
              <Button variant="outline" onClick={handlePreviousStep}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>
              <Button onClick={handleGenerateImage} disabled={isGeneratingImages}>
                {isGeneratingImages ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating Images...
                  </>
                ) : (
                  "Generate Final Images"
                )}
              </Button>
            </div>

            {imageGenerationError && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6">
                <div className="flex items-center">
                  <AlertCircle className="h-4 w-4 text-destructive mr-2" />
                  <p className="text-destructive">{imageGenerationError}</p>
                </div>
              </div>
            )}

            {generatedImages.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-center">Your Generated Images</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {generatedImages.map((image) => (
                    <Card key={image.id} className="overflow-hidden">
                      <CardContent className="p-0">
                        <img
                          src={image.url}
                          alt="Generated meme"
                          className="w-full h-64 object-cover"
                        />
                        <div className="p-4">
                          <Button
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = image.url;
                              link.download = `meme-${image.id}.jpg`;
                              link.click();
                            }}
                            className="w-full"
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Download
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Dialog Components */}
        <ApiKeyDialog open={showApiKeyDialog} onOpenChange={setShowApiKeyDialog} onApiKeySet={() => {}} />
        <IdeogramKeyDialog open={showIdeogramKeyDialog} onOpenChange={setShowIdeogramKeyDialog} onApiKeySet={() => {}} />
        <ProxySettingsDialog open={showProxySettingsDialog} onOpenChange={setShowProxySettingsDialog} />
        <CorsRetryDialog open={showCorsRetryDialog} onOpenChange={setShowCorsRetryDialog} onRetry={handleGenerateImage} />

      </div>
    </div>
  );
};

export default Index;