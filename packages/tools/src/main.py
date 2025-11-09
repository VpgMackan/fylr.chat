from InquirerPy import inquirer
from dotenv import load_dotenv

load_dotenv()

from .giftcard import main as main_giftcard


def main():
    while True:
        action = inquirer.select(
            message="What util do you want to use?",
            choices=["Gift Card", "Exit"],
        ).execute()
        match action:
            case "Gift Card":
                main_giftcard()
            case "Exit":
                break
