from selenium import webdriver
from selenium.webdriver.edge.service import Service
from selenium.webdriver.edge.options import Options
from webdriver_manager.microsoft import EdgeChromiumDriverManager
from selenium.webdriver.common.keys import Keys


def initialize_browser():
    edge_options = Options()
    edge_options.set_capability('ms:edgeChromium', True)
    edge_options.set_capability('ms:loggingPrefs', {'browser': 'ALL'})
    edge_options.page_load_strategy = 'normal'

    service = Service(EdgeChromiumDriverManager().install())
    driver = webdriver.Edge(service=service, options=edge_options)

    driver.maximize_window()
    driver.set_page_load_timeout(30)
    driver.implicitly_wait(10)
    return driver



def keyboard_shortcut(key):
    """
    Convertit les raccourcis clavier en commandes Selenium
    """
    shortcuts = {
        'enter': Keys.RETURN,
        'tab': Keys.TAB,
        'escape': Keys.ESCAPE,
        'down': Keys.DOWN,
        'up': Keys.UP,
        'left': Keys.LEFT,
        'right': Keys.RIGHT
    }
    return shortcuts.get(key.lower(), key)
