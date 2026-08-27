import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import GameLeaderboard from "./GameLeaderboard";

interface GameLeaderboardModalProps {
    isOpen: boolean;
    onClose: (open: boolean) => void;
    gameId: string;
    gameName: string;
}

const GameLeaderboardModal = ({ isOpen, onClose, gameId, gameName }: GameLeaderboardModalProps) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto w-full p-0 gap-0 bg-transparent border-none shadow-none">
                <div className="bg-background rounded-lg border shadow-lg overflow-hidden">
                    <DialogHeader className="p-6 pb-2">
                        <DialogTitle className="sr-only">
                            Bảng xếp hạng {gameName}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="p-6 pt-2">
                        <GameLeaderboard
                            gameId={gameId}
                            gameName={gameName}
                        />
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default GameLeaderboardModal;
