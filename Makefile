CC = gcc
CFLAGS = -Wall -Wextra
SRC = moduleC/main.c moduleC/mesures.c moduleC/analyse.c

module_c: $(SRC) moduleC/gestion.h
	$(CC) $(CFLAGS) -o module_c $(SRC)

clean:
	rm -f module_c
