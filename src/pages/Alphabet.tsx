import { motion } from "framer-motion";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Volume2 } from "lucide-react";

const alphabet = [
  { letter: "A", pronunciation: "/eɪ/", example: "Apple" },
  { letter: "B", pronunciation: "/biː/", example: "Ball" },
  { letter: "C", pronunciation: "/siː/", example: "Cat" },
  { letter: "D", pronunciation: "/diː/", example: "Dog" },
  { letter: "E", pronunciation: "/iː/", example: "Elephant" },
  { letter: "F", pronunciation: "/ef/", example: "Fish" },
  { letter: "G", pronunciation: "/dʒiː/", example: "Girl" },
  { letter: "H", pronunciation: "/eɪtʃ/", example: "House" },
  { letter: "I", pronunciation: "/aɪ/", example: "Ice" },
  { letter: "J", pronunciation: "/dʒeɪ/", example: "Juice" },
  { letter: "K", pronunciation: "/keɪ/", example: "Kite" },
  { letter: "L", pronunciation: "/el/", example: "Lion" },
  { letter: "M", pronunciation: "/em/", example: "Moon" },
  { letter: "N", pronunciation: "/en/", example: "Nose" },
  { letter: "O", pronunciation: "/oʊ/", example: "Orange" },
  { letter: "P", pronunciation: "/piː/", example: "Pen" },
  { letter: "Q", pronunciation: "/kjuː/", example: "Queen" },
  { letter: "R", pronunciation: "/ɑːr/", example: "Rain" },
  { letter: "S", pronunciation: "/es/", example: "Sun" },
  { letter: "T", pronunciation: "/tiː/", example: "Tree" },
  { letter: "U", pronunciation: "/juː/", example: "Umbrella" },
  { letter: "V", pronunciation: "/viː/", example: "Violin" },
  { letter: "W", pronunciation: "/ˈdʌbəljuː/", example: "Water" },
  { letter: "X", pronunciation: "/eks/", example: "X-ray" },
  { letter: "Y", pronunciation: "/waɪ/", example: "Yellow" },
  { letter: "Z", pronunciation: "/ziː/", example: "Zebra" },
];

const Alphabet = () => {
  return (
    <div className="py-6">
      <h1 className="mb-6 text-center text-2xl font-bold">Bảng chữ cái</h1>

      <div className="grid grid-cols-3 gap-3">
        {alphabet.map((item, index) => (
          <motion.div
            key={item.letter}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.02 }}
          >
            <Card className="group cursor-pointer p-3 text-center transition-all hover:bg-primary hover:text-primary-foreground">
              <div className="flex items-center justify-between">
                <span className="text-3xl font-black">{item.letter}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <Volume2 className="size-4" />
                </Button>
              </div>
              <p className="mt-1 text-xs text-muted-foreground group-hover:text-primary-foreground/80">
                {item.pronunciation}
              </p>
              <p className="text-sm font-medium">{item.example}</p>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Alphabet;
