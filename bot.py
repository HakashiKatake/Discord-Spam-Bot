import discord
from discord.ext import commands, tasks
import asyncio
from datetime import datetime, time, timedelta
import pytz
import os
from os import getenv

# Bot setup
intents = discord.Intents.default()
intents.messages = True
intents.guilds = True
intents.dm_messages = True

bot = commands.Bot(command_prefix="!", intents=intents)

target_user = None  # Placeholder for the target user
message_to_send = ""



@bot.event
async def on_ready():
    print(f"Bot is ready! Logged in as {bot.user}")


def time_until_midnight():
    """Calculate the time remaining until midnight IST."""
    ist = pytz.timezone("Asia/Kolkata")
    now = datetime.now(ist)
    midnight = (now + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
    return (midnight - now).total_seconds()


@tasks.loop(seconds=10)  # Runs every 10 seconds
async def spam_messages():
    """Spam the target user until midnight."""
    global target_user, message_to_send

    if target_user:
        try:
            await target_user.send(message_to_send)
            print(f"Message sent to {target_user.name}")
        except Exception as e:
            print(f"Error: {e}")
    else:
        print("No target user set. Waiting for command.")


@bot.command()
async def start_spam(ctx, user: discord.User, *, message: str):
    """Start spamming the specified user with the given message."""
    global target_user, message_to_send

    target_user = user
    message_to_send = message

    # Start spamming and set a timeout until midnight
    spam_messages.start()
    await ctx.send(f"Started spamming {user.name}. It will stop at midnight IST.")
    
    # Stop the task automatically at midnight IST
    await asyncio.sleep(time_until_midnight())
    spam_messages.stop()
    target_user = None
    message_to_send = ""
    await ctx.send("Spamming stopped automatically at midnight IST.")


@bot.command()
async def stop_spam(ctx):
    """Stop the spamming process manually."""
    global target_user, message_to_send

    if spam_messages.is_running():
        spam_messages.stop()
        target_user = None
        message_to_send = ""
        await ctx.send("Spamming stopped manually.")
    else:
        await ctx.send("No spamming is currently running.")



bot.run(os.getenv("DISCORD_TOKEN"))
