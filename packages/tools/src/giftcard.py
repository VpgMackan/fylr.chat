import random
import string
import datetime
from datetime import datetime, timedelta
from InquirerPy import inquirer, prompt

from .database import get_db_session, GiftCard


def generate_gift_card_code(block1=None, block2=None, block3=None, checksum_length=2):
    """
    Generates a gift card code in the format FYLR-xxxx-xxxx-xxxx-xx (or -xxx).
    If blocks are not provided, they are auto-generated.
    The last part is a checksum of the specified length (2 or 3).
    """
    if block1 is None:
        block1 = "".join(random.choices(string.ascii_uppercase + string.digits, k=4))
    if block2 is None:
        block2 = "".join(random.choices(string.ascii_uppercase + string.digits, k=4))
    if block3 is None:
        block3 = "".join(random.choices(string.ascii_uppercase + string.digits, k=4))

    if len(block1) != 4 or len(block2) != 4 or len(block3) != 4:
        raise ValueError("Each block must be exactly 4 characters long.")

    combined = block1 + block2 + block3

    checksum_value = sum(ord(c) for c in combined) % (36**checksum_length)
    checksum = ""
    for _ in range(checksum_length):
        checksum = (string.ascii_uppercase + string.digits)[
            checksum_value % 36
        ] + checksum
        checksum_value = checksum_value // 36

    code = f"FYLR-{block1}-{block2}-{block3}-{checksum}"
    return code


def validate_gift_card_code(code):
    """
    Validates a gift card code.
    Returns True if the format is correct and the checksum matches.
    """
    try:
        parts = code.split("-")
        if len(parts) != 5 or parts[0] != "FYLR":
            return False

        block1, block2, block3, checksum = parts[1], parts[2], parts[3], parts[4]
        if (
            len(block1) != 4
            or len(block2) != 4
            or len(block3) != 4
            or len(checksum) not in (2, 3)
        ):
            return False

        combined = block1 + block2 + block3
        checksum_length = len(checksum)
        checksum_value = sum(ord(c) for c in combined) % (36**checksum_length)
        calculated_checksum = ""
        for _ in range(checksum_length):
            calculated_checksum = (
                string.ascii_uppercase
                + string.digits[checksum_value % 36]
                + calculated_checksum
            )
            checksum_value = checksum_value // 36

        return calculated_checksum == checksum
    except:
        return False


def main():
    while True:
        action = inquirer.select(
            message="What do you want to do:",
            choices=["Create Gift Card", "Check Info", "Delete Gift Card", "Exit"],
        ).execute()
        match action:
            case "Create Gift Card":
                while True:
                    result = prompt(
                        [
                            {
                                "type": "input",
                                "message": "How many days:",
                                "name": "days",
                            },
                            {
                                "type": "input",
                                "message": "How many checksum digets:",
                                "name": "checksum",
                            },
                            {
                                "type": "input",
                                "message": "What code (empty to autogen):",
                                "name": "code",
                            },
                            {"type": "confirm", "message": "Confirm?"},
                        ]
                    )
                    if result[3]:
                        try:
                            days = int(result["days"])
                        except ValueError:
                            print("Days must be an integer.")
                            continue

                        try:
                            checksum = int(result["checksum"])
                        except ValueError:
                            print("Checksum must be an integer.")
                            continue

                        code = ""
                        if result["code"] == "":
                            code = generate_gift_card_code(checksum_length=checksum)
                        else:
                            code_block = result["code"].split("-")
                            if (
                                len(code_block[0]) != 4
                                or len(code_block[1]) != 4
                                or len(code_block[2]) != 4
                            ):
                                raise ValueError(
                                    "Each block must be exactly 4 characters long."
                                )
                            code = generate_gift_card_code(
                                checksum_length=checksum,
                                block1=code_block[0],
                                block2=code_block[1],
                                block3=code_block[2],
                            )

                        with get_db_session() as db:
                            if (
                                db.query(GiftCard).filter(GiftCard.code == code).first()
                                != None
                            ):
                                print("Code already used, use another one.")
                                continue

                            expires_at = datetime.now() + timedelta(days=days)
                            gift_card = GiftCard(
                                code=code,
                                days=days,
                                status="AVAILABLE",
                                expires_at=expires_at,
                            )
                            db.add(gift_card)
                            db.commit()

                            print("\n✅ Gift Card Created Successfully!")
                            print(f"Code: {code}")
                            print(f"Days: {days}")
                            print(f"Status: AVAILABLE")
                            print(
                                f"Expires At: {expires_at.strftime('%Y-%m-%d %H:%M:%S')}"
                            )
                            print()
                        break
            case "Check Info":
                while True:
                    result = prompt(
                        [
                            {
                                "type": "input",
                                "message": "Enter card to show details for:",
                                "name": "code",
                            },
                            {"type": "confirm", "message": "Confirm?"},
                        ]
                    )
                    if result[1]:
                        with get_db_session() as db:
                            gift_card = (
                                db.query(GiftCard)
                                .filter(GiftCard.code == result["code"])
                                .first()
                            )
                            if gift_card == None:
                                print("Code not found")
                                continue

                            print("\n✅ Gift Card Found Successfully!")
                            print(f"Code: {gift_card.code}")
                            print(f"Days: {gift_card.days}")
                            print(f"Status: {gift_card.status}")
                            print(
                                f"Expires At: {gift_card.expires_at.strftime('%Y-%m-%d %H:%M:%S')}"
                            )
                            print()
                        break
            case "Delete Gift Card":
                while True:
                    result = prompt(
                        [
                            {
                                "type": "input",
                                "message": "Enter code to delete gift card:",
                                "name": "code",
                            },
                            {"type": "confirm", "message": "Correct code?"},
                        ]
                    )
                    if result[1]:
                        with get_db_session() as db:
                            gift_card = (
                                db.query(GiftCard)
                                .filter(GiftCard.code == result["code"])
                                .first()
                            )
                            if gift_card == None:
                                print("Code not found")
                                continue

                            print("Is this the correct card")
                            print(f"Code: {gift_card.code}")
                            print(f"Days: {gift_card.days}")
                            print(f"Status: {gift_card.status}")
                            print(
                                f"Expires At: {gift_card.expires_at.strftime('%Y-%m-%d %H:%M:%S')}"
                            )
                            print()
                            confirmation = prompt(
                                [
                                    {"type": "confirm", "message": "Confirm deletion?"},
                                ]
                            )
                            if confirmation[0]:
                                db.delete(gift_card)
                                db.commit()
                                break
            case "Exit":
                break
