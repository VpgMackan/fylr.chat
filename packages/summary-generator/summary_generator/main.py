from .SummaryGenerator import SummaryGenerator


def main():
    try:
        generator = SummaryGenerator()
        generator.run()
    except Exception as e:
        print(e)
